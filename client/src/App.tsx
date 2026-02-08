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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize session for the app
  const sessionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth', {});
      return response.json();
    },
    onSuccess: () => {
      setIsAuthenticated(true);
    },
  });

  useEffect(() => {
    sessionMutation.mutate();
  }, []);

  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <Switch>
      <Route path="/">
        <Home />
      </Route>
      <Route path="/groups">
        <GroupsPage />
      </Route>
      <Route path="/alerts">
        <AlertsPage />
      </Route>
      <Route path="/archive">
        <ArchivePage />
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
