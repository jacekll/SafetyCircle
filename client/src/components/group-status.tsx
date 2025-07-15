import { useQuery } from '@tanstack/react-query';
import { type GroupWithDetails } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Users, Briefcase, Plus, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface GroupStatusProps {
  sessionId: string;
  onJoinGroup: () => void;
}

export function GroupStatus({ sessionId, onJoinGroup }: GroupStatusProps) {
  const { data: groupsData, isLoading } = useQuery({
    queryKey: ['/api/groups'],
    enabled: !!sessionId,
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
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  group.name.toLowerCase().includes('family') ? 'bg-primary' : 'bg-warning'
                }`}>
                  {group.name.toLowerCase().includes('family') ? (
                    <Users className="text-white text-sm" />
                  ) : (
                    <Briefcase className="text-white text-sm" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{group.name}</div>
                  <div className="text-sm text-gray-500">
                    {group.memberCount} members • 
                    <span className="text-success ml-1">Active</span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            You haven't joined any groups yet.
            <br />
            Join or create a group to get started.
          </p>
        </div>
      )}
    </div>
  );
}
