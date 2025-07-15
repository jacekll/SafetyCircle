import { useCallback, useEffect, useState } from 'react';

export interface HapticFeedbackOptions {
  pattern?: number | number[];
  duration?: number;
  intensity?: 'light' | 'medium' | 'heavy';
}

export function useHapticFeedback() {
  const [isEnabled, setIsEnabled] = useState(true);
  
  useEffect(() => {
    // Load saved preference from localStorage
    const savedPreference = localStorage.getItem('hapticFeedbackEnabled');
    if (savedPreference !== null) {
      setIsEnabled(JSON.parse(savedPreference));
    }
  }, []);

  const isSupported = useCallback(() => {
    return 'vibrate' in navigator;
  }, []);

  const triggerEmergencyAlert = useCallback(() => {
    if (!isSupported() || !isEnabled) return;

    // Emergency alert pattern: long-short-long-short-long (SOS pattern)
    const sosPattern = [500, 200, 200, 200, 200, 200, 500, 200, 500];
    
    try {
      navigator.vibrate(sosPattern);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isSupported, isEnabled]);

  const triggerAnswered = useCallback(() => {
    if (!isSupported() || !isEnabled) return;

    // Alert answered pattern: two quick vibrations
    const answeredPattern = [100, 100, 100];
    
    try {
      navigator.vibrate(answeredPattern);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isSupported, isEnabled]);

  const triggerGeneral = useCallback((options: HapticFeedbackOptions = {}) => {
    if (!isSupported() || !isEnabled) return;

    const { pattern = 200, duration = 200, intensity = 'medium' } = options;
    
    let vibrationPattern: number | number[];
    
    if (typeof pattern === 'number') {
      vibrationPattern = pattern;
    } else {
      vibrationPattern = pattern;
    }

    // Adjust intensity by modifying duration (since vibration API doesn't support intensity directly)
    if (typeof vibrationPattern === 'number') {
      switch (intensity) {
        case 'light':
          vibrationPattern = Math.max(50, vibrationPattern * 0.5);
          break;
        case 'heavy':
          vibrationPattern = Math.min(1000, vibrationPattern * 1.5);
          break;
        default:
          break;
      }
    }
    
    try {
      navigator.vibrate(vibrationPattern);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }, [isSupported, isEnabled]);

  const stopVibration = useCallback(() => {
    if (!isSupported()) return;
    
    try {
      navigator.vibrate(0);
    } catch (error) {
      console.warn('Failed to stop vibration:', error);
    }
  }, [isSupported]);

  return {
    isSupported: isSupported(),
    isEnabled,
    triggerEmergencyAlert,
    triggerAnswered,
    triggerGeneral,
    stopVibration
  };
}