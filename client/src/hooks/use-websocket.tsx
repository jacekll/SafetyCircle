import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { useLocation } from 'wouter';
import { ToastAction } from '@/components/ui/toast';
import { Check } from 'lucide-react';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export function useWebSocket(sessionId: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { triggerEmergencyAlert, triggerAnswered } = useHapticFeedback();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!sessionId) return;

    // Use the same origin as the current page for WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    
    // Ensure we have a valid host
    if (!host || host.includes('undefined')) {
      console.error('Invalid host detected:', host);
      return;
    }
    
    const wsUrl = `${protocol}//${host}/ws`;
    
    console.log('WebSocket connection details:', { 
      protocol: window.location.protocol, 
      hostname: window.location.hostname, 
      port: window.location.port, 
      host: window.location.host,
      href: window.location.href 
    });
    console.log('Connecting to WebSocket:', wsUrl);
    
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      console.error('Attempted URL:', wsUrl);
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connection opened, authenticating...');
      // Don't set connected yet - wait for auth success
      ws.send(JSON.stringify({
        type: 'auth',
        sessionId: sessionId
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        
        if (message.type === 'auth_success') {
          console.log('WebSocket authenticated successfully');
          setIsConnected(true); // Only set connected after successful auth
        } else if (message.type === 'alert') {
          // Show toast notification for new alerts
          const alert = message.alert;
          
          if (alert.type === 'emergency') {
            const locationText = alert.latitude && alert.longitude ? ' with location' : '';
            
            // Trigger haptic feedback for emergency alerts
            triggerEmergencyAlert();
            
            toast({
              title: "🚨 EMERGENCY ALERT",
              description: `${alert.senderName} from ${alert.groupName}${locationText}`,
              variant: "destructive",
              action: (
                <ToastAction
                  altText="View Alert History"
                  onClick={() => navigate('/alerts')}
                >
                  View Details
                </ToastAction>
              )
            });
          }
        } else if (message.type === 'alert-answered') {

          // Trigger haptic feedback for answered alerts
          triggerAnswered();
          
          // Show green checkmark notification for first answer
          toast({
            title: (
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>Alert Answered</span>
              </div>
            ),
            description: `${message.alert.answeredByName} has responded to the emergency alert`,
            className: "border-green-200 bg-green-50 text-green-900",
            action: (
              <ToastAction
                altText="View Alert History"
                onClick={() => navigate('/alerts')}
                className="text-green-600 hover:text-green-700"
              >
                View Details
              </ToastAction>
            )
          });
          
          // Invalidate queries to refresh the alerts list
          queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event.code, event.reason);
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [sessionId, toast, navigate]);

  return { isConnected };
}
