import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Communities from "./pages/Communities";
import Profile from "./pages/Profile";
import CommunityManagement from "./pages/CommunityManagement";
import CommunityInvite from "./pages/CommunityInvite";
import GroupChat from "./pages/GroupChat";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  
  // Routes that should show the sidebar
  const showSidebar = !["/", "/auth"].includes(location.pathname);

  if (!showSidebar) {
    return (
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-12 border-b border-border bg-card flex items-center px-4 sticky top-0 z-10">
            <SidebarTrigger />
          </header>
          <main className="flex-1">
            <Routes>
              <Route path="/communities" element={<Communities />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/communities/:communityId/manage" element={<CommunityManagement />} />
              <Route path="/groups/:groupId/chat" element={<GroupChat />} />
              <Route path="/invite/:inviteCode" element={<CommunityInvite />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
