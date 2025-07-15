import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useWebSocket } from '@/hooks/use-websocket';
import { type GroupWithDetails } from '@shared/schema';
import { SOSButton } from '@/components/sos-button';
import { SOSConfirmModal } from '@/components/modals/sos-confirm-modal';
import { JoinGroupModal } from '@/components/modals/join-group-modal';
import { PWAInstallPrompt } from '@/components/pwa-install-prompt';
import { Button } from '@/components/ui/button';
import { Shield, Users, AlertTriangle, Settings, Download } from 'lucide-react';
import { Link } from 'wouter';

interface HomeProps {
  sessionId: string;
}

export default function Home({ sessionId }: HomeProps) {
  const [nickname, setNickname] = useState('Anonymous');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);

  const { isConnected } = useWebSocket(sessionId);

  // Get user data
  const { data: userData } = useQuery({
    queryKey: ['/api/auth'],
    enabled: !!sessionId,
  });

  // Get user's groups
  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['/api/groups'],
    enabled: !!sessionId,
  });

  const groups: GroupWithDetails[] = groupsData?.groups || [];

  useEffect(() => {
    if (userData?.user?.nickname) {
      setNickname(userData.user.nickname);
    }
  }, [userData]);

  const handleSOSAlert = () => {
    // Don't proceed if groups are still loading
    if (groupsLoading) {
      return;
    }
    
    if (groups.length === 0) {
      setShowJoinModal(true);
      return;
    }
    setShowSOSModal(true);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-emergency rounded-lg flex items-center justify-center">
                <Shield className="text-white text-sm" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">SafeAlert</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-success animate-pulse' : 'bg-warning'
                }`}></div>
                <span className="text-xs text-gray-600">
                  {isConnected ? 'Connected' : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
        
        {/* SOS Button */}
        <SOSButton onEmergencyAlert={handleSOSAlert} nickname={nickname} />

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 gap-4">
          <Link href="/groups">
            <Button
              variant="outline"
              className="w-full h-auto p-6 flex items-center justify-between text-left hover:border-primary hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="text-primary text-lg" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Your Groups</div>
                  <div className="text-sm text-gray-500">Manage and join groups</div>
                </div>
              </div>
            </Button>
          </Link>
          
          <Link href="/alerts">
            <Button
              variant="outline"
              className="w-full h-auto p-6 flex items-center justify-between text-left hover:border-orange-500 hover:bg-orange-50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="text-orange-600 text-lg" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">Alert History</div>
                  <div className="text-sm text-gray-500">View recent emergency alerts</div>
                </div>
              </div>
            </Button>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">Quick Actions</h3>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowJoinModal(true)}
            >
              Join Group with Token
            </Button>
            
            <Link href="/sos-widget">
              <Button
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              >
                <Download className="w-4 h-4 mr-2" />
                SOS Home Screen Widget
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Modals */}
      <JoinGroupModal 
        open={showJoinModal} 
        onOpenChange={setShowJoinModal}
        sessionId={sessionId}
      />
      
      <SOSConfirmModal 
        open={showSOSModal} 
        onOpenChange={setShowSOSModal}
        groups={groups}
        sessionId={sessionId}
      />
    </div>
  );
}
