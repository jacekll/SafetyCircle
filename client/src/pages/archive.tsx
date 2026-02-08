import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Archive, AlertCircle, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { AlertWithDetails } from "@shared/schema";

function formatLocationLink(latitude: string | null, longitude: string | null): string | null {
  if (!latitude || !longitude) return null;
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export default function ArchivePage() {
  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['/api/alerts/archived'],
  });

  const archivedAlerts = alertsData?.alerts || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/alerts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Alerts
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-orange-600" />
            <h1 className="text-2xl font-bold">Archived Alerts</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : archivedAlerts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Archived Alerts</h3>
              <p className="text-gray-600 dark:text-gray-400">
                When you archive alerts, they will appear here for future reference.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {archivedAlerts.map((alert: AlertWithDetails) => (
              <Card key={alert.id} className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {alert.type === 'emergency' ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      <CardTitle className="text-lg">{alert.message}</CardTitle>
                    </div>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      Archived
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-4 text-sm">
                    <span>From: <strong>{alert.senderName}</strong></span>
                    <span>Group: <strong>{alert.groupName}</strong></span>
                    <span>{format(alert.sentAt, "PPpp")}</span>
                    {alert.answeredBy && alert.answeredByName && (
                      <span className="text-green-600 font-medium">
                        ✓ Answered by {alert.answeredByName}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                
                {alert.latitude && alert.longitude && (
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin className="h-4 w-4" />
                      <span>Location shared</span>
                      {alert.locationAccuracy && (
                        <span className="text-xs">
                          (±{alert.locationAccuracy}m)
                        </span>
                      )}
                      <a
                        href={formatLocationLink(alert.latitude, alert.longitude)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                      >
                        View on Map
                      </a>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}