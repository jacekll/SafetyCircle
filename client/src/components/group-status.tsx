import { useQuery } from '@tanstack/react-query';
import { type GroupWithDetails } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Shield, Plus, MoreVertical } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from '@/components/ui/dropdown-menu';
import { GroupDetailsModal } from '@/components/modals/group-details-modal';
import { useState } from 'react';

interface GroupStatusProps {
  onJoinGroup: () => void;
}

export function GroupStatus({ onJoinGroup }: GroupStatusProps) {
  const [selectedGroup, setSelectedGroup] = useState<GroupWithDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['/api/groups'],
  });

  const groups: GroupWithDetails[] = groupsData?.groups || [];

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Your Groups</h2>
        <Button 
          variant="ghost"
          size="sm"
          onClick={onJoinGroup}
          className="text-primary hover:text-primary-dark text-sm font-medium"
        >
          <Plus className="w-4 h-4 mr-1" />
          Join Group
        </Button>
      </div>
      
      {groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map((group) => (
            <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Shield className="text-blue-600 text-sm" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{group.name}</div>
                  <div className="text-sm text-gray-500">
                    {group.memberCount} members • 
                    <span className="text-success ml-1">Active</span>
                  </div>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedGroup(group);
                      setShowDetailsModal(true);
                    }}
                  >
                    View Details
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            You haven't joined any groups yet.
            <br />
            Join or create a group to get started.
          </p>
        </div>
      )}

      <GroupDetailsModal
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
        group={selectedGroup}
      />
    </div>
  );
}
