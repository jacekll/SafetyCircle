import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { type GroupWithDetails, type User } from '@shared/schema';
import { Shield, Users, Eye, EyeOff, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GroupDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupWithDetails | null;
}

export function GroupDetailsModal({ open, onOpenChange, group }: GroupDetailsModalProps) {
  const [showToken, setShowToken] = useState(false);
  const { toast } = useToast();

  const { data: membersData, isLoading: loadingMembers } = useQuery({
    queryKey: ['/api/groups', group?.id, 'members'],
    enabled: !!group?.id && open,
  });

  const members: User[] = membersData?.members || [];

  if (!group) return null;

  const copyToken = async () => {
    if (group.token) {
      try {
        await navigator.clipboard.writeText(group.token);
        toast({
          title: "Token Copied",
          description: "Group token has been copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Copy Failed",
          description: "Could not copy token to clipboard",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Shield className="text-blue-600 w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-left">{group.name}</DialogTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  {group.memberCount} members
                </Badge>

              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-4">

          {/* Group Token */}
          {group.token && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="font-medium text-gray-900">Group Token</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowToken(!showToken)}
                  className="h-8 px-2"
                >
                  {showToken ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 p-3 bg-white border rounded font-mono text-sm">
                  {showToken ? group.token : '••••••••'}
                </div>
                {showToken && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToken}
                    className="h-10 px-3"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Share this token with others to invite them to the group
              </p>
            </div>
          )}

          {/* Group Members */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Group Members ({group.memberCount})</h4>
            {loadingMembers ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member, index) => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">{member.nickname}</span>
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="text-sm text-gray-500">No members found</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}