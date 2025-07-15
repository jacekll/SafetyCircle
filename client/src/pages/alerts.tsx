import { RecentAlerts } from '@/components/recent-alerts';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ArrowLeft, AlertTriangle, Activity, Menu, Archive } from 'lucide-react';
import { Link } from 'wouter';

interface AlertsPageProps {
  sessionId: string;
}

export default function AlertsPage({ sessionId }: AlertsPageProps) {
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
              <h1 className="text-xl font-bold text-gray-900">Alert History</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <Activity className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Live</span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2">
                    <Menu className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/archive">
                      <Archive className="h-4 w-4 mr-2" />
                      View Archive
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Emergency Info */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-emergency rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="text-white text-sm" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-1">Emergency Alerts</h3>
              <p className="text-sm text-gray-600">
                All emergency alerts sent and received by your groups will appear here in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <RecentAlerts sessionId={sessionId} />

        {/* Help Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">How Alerts Work</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-emergency rounded-full mt-2 flex-shrink-0"></div>
              <div>Emergency alerts are sent instantly to all group members</div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-success rounded-full mt-2 flex-shrink-0"></div>
              <div>You'll receive real-time notifications when others send alerts</div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
              <div>All alerts are logged here for your reference</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}