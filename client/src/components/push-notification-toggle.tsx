import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, Smartphone, Loader2, TestTube } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function PushNotificationToggle() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe
  } = usePushNotifications();
  
  const [testLoading, setTestLoading] = useState(false);
  const { toast } = useToast();

  const testPushNotification = async () => {
    if (!isSubscribed) {
      toast({
        title: "Test Failed",
        description: "Please enable push notifications first",
        variant: "destructive",
      });
      return;
    }

    setTestLoading(true);
    try {
      await apiRequest('POST', '/api/push/test', {});
      toast({
        title: "Test Sent",
        description: "Check for a test notification",
        variant: "default",
      });
    } catch (error: any) {
      console.error('Test push notification failed:', error);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to send test notification",
        variant: "destructive",
      });
    } finally {
      setTestLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <Smartphone className="w-4 h-4" />
        <span>Push notifications not supported on this device</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            {isSubscribed ? (
              <>
                <Bell className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Push Notifications</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Enabled
                </Badge>
              </>
            ) : (
              <>
                <BellOff className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium">Push Notifications</span>
                <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                  Disabled
                </Badge>
              </>
            )}
          </div>
        </div>
        
        <Button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading}
          size="sm"
          variant={isSubscribed ? "outline" : "default"}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {isSubscribed ? 'Disabling...' : 'Enabling...'}
            </>
          ) : (
            <>
              {isSubscribed ? (
                <>
                  <BellOff className="w-3 h-3 mr-1" />
                  Disable
                </>
              ) : (
                <>
                  <Bell className="w-3 h-3 mr-1" />
                  Enable
                </>
              )}
            </>
          )}
        </Button>
      </div>
      
      {error && (
        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      
      {isSubscribed && (
        <div className="space-y-2">
          <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
            You'll receive emergency alerts even when the app is closed
          </div>
          <Button
            onClick={testPushNotification}
            disabled={testLoading}
            size="sm"
            variant="outline"
            className="w-full"
          >
            {testLoading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Sending Test...
              </>
            ) : (
              <>
                <TestTube className="w-3 h-3 mr-1" />
                Test Push Notification
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}