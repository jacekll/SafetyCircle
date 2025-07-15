import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { type GroupWithDetails } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface SOSConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: GroupWithDetails[];
  sessionId: string;
}

export function SOSConfirmModal({ open, onOpenChange, groups, sessionId }: SOSConfirmModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendAlertMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/alerts/emergency', {});
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "🚨 Emergency Alert Sent",
        description: `Alert sent to ${data.groupCount} group(s)`,
        variant: "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send emergency alert",
        variant: "destructive",
      });
    },
  });

  const handleSendAlert = () => {
    sendAlertMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto animate-pulse">
        <DialogHeader className="text-center">
          <div className="w-20 h-20 bg-emergency rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
            <AlertTriangle className="text-white text-2xl" />
          </div>
          <DialogTitle className="text-xl font-bold">EMERGENCY ALERT</DialogTitle>
          <p className="text-sm text-gray-600">
            This will send an immediate alert to all your group members
          </p>
        </DialogHeader>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-gray-700">
            <div className="font-medium mb-1">Alert will be sent to:</div>
            {groups.length > 0 ? (
              <div className="space-y-1">
                {groups.map((group) => (
                  <div key={group.id}>
                    • {group.name} ({group.memberCount} members)
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">No groups joined yet</div>
            )}
          </div>
        </div>

        <div className="flex space-x-3">
          <Button 
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={sendAlertMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            className="flex-1 bg-emergency hover:bg-emergency-dark font-bold"
            onClick={handleSendAlert}
            disabled={sendAlertMutation.isPending || groups.length === 0}
          >
            {sendAlertMutation.isPending ? 'SENDING...' : 'SEND ALERT'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
