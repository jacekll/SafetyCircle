import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type AlertWithDetails } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { AlertTriangle, CheckCircle, MapPin, ExternalLink, MoreVertical, Archive, MessageCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ArchiveConfirmModal } from '@/components/modals/archive-confirm-modal';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';

function formatLocationLink(latitude: string | null, longitude: string | null): string | null {
  if (!latitude || !longitude) return null;
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function RecentAlerts() {
  const [selectedAlert, setSelectedAlert] = useState<AlertWithDetails | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { triggerGeneral } = useHapticFeedback();

  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['/api/alerts'],
  });

  const answerMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return await apiRequest('POST', `/api/alerts/${alertId}/answer`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      toast({
        title: "Alert answered",
        description: "You've marked this alert as answered.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to answer alert",
        variant: "destructive",
      });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return await apiRequest('POST', `/api/alerts/${alertId}/archive`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      toast({
        title: "Alert archived",
        description: "The alert has been moved to your archive.",
      });
      setShowArchiveModal(false);
      setSelectedAlert(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive alert",
        variant: "destructive",
      });
    },
  });

  const alerts: AlertWithDetails[] = alertsData?.alerts || [];

  const handleAnswerClick = (alert: AlertWithDetails) => {
    // Trigger haptic feedback for user action
    triggerGeneral({ intensity: 'light' });
    answerMutation.mutate(alert.id);
  };

  const handleArchiveClick = (alert: AlertWithDetails) => {
    // Trigger haptic feedback for user action
    triggerGeneral({ intensity: 'light' });
    setSelectedAlert(alert);
    setShowArchiveModal(true);
  };

  const handleArchiveConfirm = () => {
    if (selectedAlert) {
      archiveMutation.mutate(selectedAlert.id);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-6 w-16" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Alerts</h2>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark text-sm font-medium">
          View All
        </Button>
      </div>
      
      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`flex items-start space-x-3 p-3 rounded-lg border ${
                alert.type === 'emergency' 
                  ? 'bg-red-50 border-red-100' 
                  : 'bg-gray-50 border-gray-100'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                alert.type === 'emergency' ? 'bg-emergency' : 'bg-success'
              }`}>
                {alert.type === 'emergency' ? (
                  <AlertTriangle className="text-white text-sm" />
                ) : (
                  <CheckCircle className="text-white text-sm" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">{alert.senderName}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(alert.sentAt), { addSuffix: true })}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {alert.type === 'emergency' && !alert.answeredBy && (
                          <DropdownMenuItem onClick={() => handleAnswerClick(alert)}>
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Mark as Answered
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleArchiveClick(alert)}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="text-sm text-gray-600 mt-1">{alert.groupName}</div>
                <div className={`text-xs font-medium mt-2 ${
                  alert.type === 'emergency' ? 'text-emergency' : 'text-success'
                }`}>
                  {alert.type === 'emergency' ? 'EMERGENCY ALERT SENT' : 'ALERT RESOLVED'}
                </div>
                
                {/* Answer Status */}
                {alert.answeredBy && alert.answeredByName && (
                  <div className="mt-2 text-xs text-green-600 font-medium">
                    ✓ Answered by {alert.answeredByName}
                  </div>
                )}
                
                {/* Location Information */}
                {alert.type === 'emergency' && alert.latitude && alert.longitude && (
                  <div className="mt-2">
                    <a
                      href={formatLocationLink(alert.latitude, alert.longitude)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>View Location</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            No alerts yet.
            <br />
            Emergency alerts will appear here.
          </p>
        </div>
      )}
      
      <ArchiveConfirmModal
        open={showArchiveModal}
        onOpenChange={setShowArchiveModal}
        alert={selectedAlert}
        onConfirm={handleArchiveConfirm}
        isLoading={archiveMutation.isPending}
      />
    </div>
  );
}
