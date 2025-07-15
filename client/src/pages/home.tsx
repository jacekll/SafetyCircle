import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useWebSocket } from '@/hooks/use-websocket';
import { type GroupWithDetails } from '@shared/schema';
import { SOSButton } from '@/components/sos-button';
import { GroupStatus } from '@/components/group-status';
import { RecentAlerts } from '@/components/recent-alerts';
import { JoinGroupModal } from '@/components/modals/join-group-modal';
import { CreateGroupModal } from '@/components/modals/create-group-modal';
import { SOSConfirmModal } from '@/components/modals/sos-confirm-modal';
import { Button } from '@/components/ui/button';
import { Shield, Key, PlusCircle } from 'lucide-react';

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('Anonymous');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSOSModal, setShowSOSModal] = useState(false);

  const { isConnected } = useWebSocket(sessionId);

  // Initialize session
  const sessionMutation = useMutation({
    mutationFn: async () => {
      const storedSessionId = localStorage.getItem('sos_session_id');
      const response = await apiRequest('POST', '/api/auth', { 
        sessionId: storedSessionId 
      });
      return response.json();
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setNickname(data.user.nickname);
      localStorage.setItem('sos_session_id', data.sessionId);
    },
  });

  // Get user's groups
  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ['/api/groups'],
    enabled: !!sessionId,
  });

  const groups: GroupWithDetails[] = groupsData?.groups || [];

  useEffect(() => {
    sessionMutation.mutate();
  }, []);

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

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-emergency rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
            <Shield className="text-white text-xl" />
          </div>
          <div className="text-lg font-medium text-gray-700">
            Initializing SafeAlert...
          </div>
        </div>
      </div>
    );
  }

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
        {/* SOS Button */}
        <SOSButton onEmergencyAlert={handleSOSAlert} nickname={nickname} />

        {/* Group Status */}
        <GroupStatus 
          sessionId={sessionId} 
          onJoinGroup={() => setShowJoinModal(true)} 
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-center text-center hover:border-primary hover:bg-blue-50 transition-colors"
            onClick={() => setShowJoinModal(true)}
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg mb-3 flex items-center justify-center">
              <Key className="text-primary text-lg" />
            </div>
            <div className="font-medium text-gray-900 mb-1">Join Group</div>
            <div className="text-xs text-gray-500">Enter group token</div>
          </Button>
          
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col items-center text-center hover:border-success hover:bg-green-50 transition-colors"
            onClick={() => setShowCreateModal(true)}
          >
            <div className="w-12 h-12 bg-green-100 rounded-lg mb-3 flex items-center justify-center">
              <PlusCircle className="text-success text-lg" />
            </div>
            <div className="font-medium text-gray-900 mb-1">Create Group</div>
            <div className="text-xs text-gray-500">Generate new token</div>
          </Button>
        </div>

        {/* Recent Alerts */}
        <RecentAlerts sessionId={sessionId} />
      </main>

      {/* Modals */}
      <JoinGroupModal 
        open={showJoinModal} 
        onOpenChange={setShowJoinModal}
        sessionId={sessionId}
      />
      
      <CreateGroupModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
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
