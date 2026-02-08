import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  vapidKey: string | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: false,
    error: null,
    vapidKey: null,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const isSupported = 
        'serviceWorker' in navigator && 
        'PushManager' in window && 
        'Notification' in window &&
        window.isSecureContext;
      
      setState(prev => ({ ...prev, isSupported }));
      
      if (!isSupported) {
        let reason = 'Unknown reason';
        if (!('serviceWorker' in navigator)) reason = 'Service Workers not supported';
        else if (!('PushManager' in window)) reason = 'Push Manager not supported';
        else if (!('Notification' in window)) reason = 'Notifications not supported';
        else if (!window.isSecureContext) reason = 'Requires HTTPS connection';
        
        setState(prev => ({ ...prev, error: `Push notifications not supported: ${reason}` }));
      }
    };

    checkSupport();
  }, []);

  // Register service worker
  useEffect(() => {
    if (!state.isSupported) return;

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        });
        await navigator.serviceWorker.ready;
      } catch (error: any) {
        setState(prev => ({ ...prev, error: `Failed to register service worker: ${error.message || error}` }));
      }
    };

    registerServiceWorker();
  }, [state.isSupported]);

  // Fetch VAPID key and check existing subscription
  useEffect(() => {
    if (!state.isSupported) return;

    const initializePushNotifications = async () => {
      try {
        const response = await fetch('/api/push/vapid-key', {
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error(`VAPID fetch failed: ${response.status} ${response.statusText}`);
        }
        const vapidData = await response.json();
        const publicKey = vapidData.publicKey;

        setState(prev => ({ ...prev, vapidKey: publicKey }));

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setState(prev => ({ ...prev, isSubscribed: !!subscription }));
      } catch (error: any) {
        setState(prev => ({
          ...prev,
          error: `Failed to initialize push notifications: ${error.message || error}`
        }));
      }
    };

    initializePushNotifications();
  }, [state.isSupported]);

  // Helper function to convert VAPID key
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    let permission;
    if (typeof Notification.requestPermission === 'function') {
      if (Notification.requestPermission.length === 0) {
        permission = await Notification.requestPermission();
      } else {
        permission = await new Promise((resolve) => {
          Notification.requestPermission(resolve);
        });
      }
    } else {
      return false;
    }

    return permission === 'granted';
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported || !state.vapidKey) {
      const errorMsg = `Prerequisites missing: supported=${state.isSupported}, vapidKey=${!!state.vapidKey}`;
      console.error('Subscribe failed:', errorMsg);
      setState(prev => ({ ...prev, error: 'Push notifications not supported or VAPID key not available' }));
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Notification permission denied'
        }));
        return false;
      }

      const registration = await navigator.serviceWorker.ready;

      // Check if there's an existing subscription first (Android requirement)
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        await existingSubscription.unsubscribe();
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(state.vapidKey)
      });

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          subscription: JSON.stringify(subscription)
        })
      });

      if (!response.ok) {
        throw new Error(`Server subscription failed: ${response.status} ${response.statusText}`);
      }
      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false
      }));

      return true;
    } catch (error: any) {
      const detailedError = error.name === 'NotSupportedError'
        ? 'Push notifications not supported on this device/browser'
        : error.name === 'NotAllowedError'
        ? 'Push notifications permission denied'
        : `Subscription error: ${error.message || error}`;

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: detailedError
      }));
      return false;
    }
  }, [state.isSupported, state.vapidKey, requestPermission]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) return false;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove subscription from server
      await apiRequest('POST', '/api/push/unsubscribe', {});

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false
      }));

      return true;
    } catch (error: any) {
      console.error('Unsubscription failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to unsubscribe from push notifications'
      }));
      return false;
    }
  }, [state.isSupported]);

  return {
    isSupported: state.isSupported,
    isSubscribed: state.isSubscribed,
    isLoading: state.isLoading,
    error: state.error,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}