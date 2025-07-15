import { useEffect, useState } from 'react';
import { useLocation } from '@/hooks/use-location';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, MapPin, Users } from 'lucide-react';

interface GroupWithDetails {
  id: number;
  name: string;
  memberCount: number;
  isAdmin: boolean;
}

export default function SOSWidget() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupWithDetails[]>([]);
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { location, isLoading: locationLoading, error: locationError } = useLocation();
  const { toast } = useToast();

  // Initialize session and load user data
  useEffect(() => {
    const initializeSession = async () => {
      setIsLoading(true);
      try {
        let storedSessionId = localStorage.getItem('sos_session_id');
        
        if (!storedSessionId) {
          // Create new session
          storedSessionId = 'session_' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('sos_session_id', storedSessionId);
        }

        setSessionId(storedSessionId);

        // Get or create user
        const authResponse = await fetch('/api/auth', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-session-id': storedSessionId 
          },
          body: JSON.stringify({ nickname: 'Anonymous' })
        });

        if (authResponse.ok) {
          const { user } = await authResponse.json();
          setNickname(user.nickname);
        }

        // Load user groups
        const groupsResponse = await fetch('/api/groups', {
          headers: { 'x-session-id': storedSessionId }
        });

        if (groupsResponse.ok) {
          const { groups: userGroups } = await groupsResponse.json();
          setGroups(userGroups);
        }

      } catch (error) {
        console.error('Failed to initialize session:', error);
        toast({
          title: "Connection Error",
          description: "Unable to connect to SOS service",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, [toast]);

  const handleEmergencyAlert = async () => {
    if (!sessionId || groups.length === 0) {
      toast({
        title: "No Groups Found",
        description: "You need to join groups first to send SOS alerts",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      const alertData = {
        message: 'Emergency SOS Alert',
        type: 'emergency' as const,
        latitude: location?.latitude?.toString(),
        longitude: location?.longitude?.toString(),
        locationAccuracy: location?.accuracy?.toString(),
      };

      const response = await fetch('/api/alerts/emergency', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-session-id': sessionId 
        },
        body: JSON.stringify(alertData)
      });

      if (response.ok) {
        const locationText = location ? ' with location data' : '';
        toast({
          title: "🚨 SOS Alert Sent!",
          description: `Emergency alert sent to ${groups.length} group(s)${locationText}`,
          variant: "default",
        });

        // Provide haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }
      } else {
        throw new Error('Failed to send alert');
      }
    } catch (error) {
      console.error('Failed to send emergency alert:', error);
      toast({
        title: "Alert Failed",
        description: "Unable to send emergency alert. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const openMainApp = () => {
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-red-50 dark:bg-red-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">Loading SOS widget...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-red-50 dark:bg-red-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
              Emergency SOS
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              One-tap emergency alert widget
            </p>
          </CardContent>
        </Card>

        {/* Status Information */}
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">User:</span>
              <span className="font-medium">{nickname}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300 flex items-center gap-1">
                <Users className="w-4 h-4" />
                Groups:
              </span>
              <span className="font-medium">{groups.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Location:
              </span>
              <span className="font-medium">
                {locationLoading ? (
                  "Getting..."
                ) : location ? (
                  "Available"
                ) : locationError ? (
                  "Unavailable"
                ) : (
                  "Not requested"
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* SOS Button */}
        <Card className="border-red-500 bg-red-600 text-white">
          <CardContent className="p-8">
            <Button
              onClick={handleEmergencyAlert}
              disabled={isSending || groups.length === 0}
              className="w-full h-24 text-2xl font-bold bg-red-700 hover:bg-red-800 disabled:bg-red-400 border-2 border-red-500 shadow-lg transform active:scale-95 transition-all duration-150"
            >
              {isSending ? (
                <div className="flex items-center gap-3">
                  <div className="animate-spin w-6 h-6 border-3 border-white border-t-transparent rounded-full"></div>
                  SENDING...
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8" />
                  EMERGENCY SOS
                </div>
              )}
            </Button>
            
            {groups.length === 0 && (
              <p className="text-red-100 text-sm text-center mt-3">
                Join groups in the main app to enable SOS alerts
              </p>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={openMainApp}
            variant="outline"
            className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
          >
            Open Main App
          </Button>
        </div>

        {/* Instructions */}
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">
              How to add to home screen:
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>• Android: Menu → "Add to Home screen"</li>
              <li>• iPhone: Share → "Add to Home Screen"</li>
              <li>• Or use browser's "Install App" option</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}