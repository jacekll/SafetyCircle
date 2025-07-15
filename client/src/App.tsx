import { Switch, Route } from "wouter";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import Home from "@/pages/home";
import GroupsPage from "@/pages/groups";
import AlertsPage from "@/pages/alerts";
import ArchivePage from "@/pages/archive";
import SOSWidget from "@/pages/sos-widget";
import NotFound from "@/pages/not-found";

function Router() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Initialize session for the app
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
      localStorage.setItem('sos_session_id', data.sessionId);
    },
  });

  useEffect(() => {
    sessionMutation.mutate();
  }, []);

  if (!sessionId) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Switch>
      <Route path="/">
        <Home sessionId={sessionId} />
      </Route>
      <Route path="/groups">
        <GroupsPage sessionId={sessionId} />
      </Route>
      <Route path="/alerts">
        <AlertsPage sessionId={sessionId} />
      </Route>
      <Route path="/archive">
        <ArchivePage sessionId={sessionId} />
      </Route>
      <Route path="/sos-widget">
        <SOSWidget />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
