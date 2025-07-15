import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertWithDetails } from "@shared/schema";
import { format } from "date-fns";

interface ArchiveConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: AlertWithDetails | null;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ArchiveConfirmModal({
  open,
  onOpenChange,
  alert,
  onConfirm,
  isLoading = false
}: ArchiveConfirmModalProps) {
  if (!alert) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive Alert</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to archive this alert? You can still view it in your archived alerts.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="py-4">
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">From:</span> {alert.senderName}
            </div>
            <div>
              <span className="font-medium">Group:</span> {alert.groupName}
            </div>
            <div>
              <span className="font-medium">Message:</span> {alert.message}
            </div>
            <div>
              <span className="font-medium">Sent:</span> {format(alert.sentAt, "PPpp")}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? "Archiving..." : "Archive"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}