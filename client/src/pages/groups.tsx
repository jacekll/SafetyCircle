import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { type GroupWithDetails } from '@shared/schema';
import { GroupStatus } from '@/components/group-status';
import { JoinGroupModal } from '@/components/modals/join-group-modal';
import { CreateGroupModal } from '@/components/modals/create-group-modal';
import { PushNotificationToggle } from '@/components/push-notification-toggle';
import { HapticFeedbackToggle } from '@/components/haptic-feedback-toggle';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Key, PlusCircle } from 'lucide-react';
import { Link } from 'wouter';

interface GroupsPageProps {
  sessionId: string;
}

export default function GroupsPage({ sessionId }: GroupsPageProps) {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: groupsData } = useQuery({
    queryKey: ['/api/groups'],
    enabled: !!sessionId,
  });

  const groups: GroupWithDetails[] = groupsData?.groups || [];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="p-2">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">Your Groups</h1>
            </div>
            <div className="text-sm text-gray-500">
              {groups.length} group{groups.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Group Status */}
        <GroupStatus 
          sessionId={sessionId} 
          onJoinGroup={() => setShowJoinModal(true)} 
        />

        {/* Group Actions */}
        <div className="grid grid-cols-1 gap-4">
          <Button
            variant="outline"
            className="h-auto p-6 flex items-center justify-between text-left hover:border-primary hover:bg-blue-50 transition-colors"
            onClick={() => setShowJoinModal(true)}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Key className="text-primary text-lg" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Join Group</div>
                <div className="text-sm text-gray-500">Enter an 8-character token</div>
              </div>
            </div>
          </Button>
          
          <Button
            variant="outline"
            className="h-auto p-6 flex items-center justify-between text-left hover:border-success hover:bg-green-50 transition-colors"
            onClick={() => setShowCreateModal(true)}
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <PlusCircle className="text-success text-lg" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Create Group</div>
                <div className="text-sm text-gray-500">Generate new group token</div>
              </div>
            </div>
          </Button>
        </div>

        {/* Group Statistics */}
        {groups.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Group Overview</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{groups.length}</div>
                <div className="text-sm text-gray-500">Groups Joined</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success">
                  {groups.reduce((sum, group) => sum + group.memberCount, 0)}
                </div>
                <div className="text-sm text-gray-500">Total Members</div>
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-4">Settings</h3>
          <div className="space-y-4">
            <PushNotificationToggle sessionId={sessionId} />
            <HapticFeedbackToggle />
          </div>
        </div>
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
    </div>
  );
}