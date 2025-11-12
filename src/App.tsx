import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Communities from "./pages/Communities";
import Profile from "./pages/Profile";
import CommunityManagement from "./pages/CommunityManagement";
import CommunityInvite from "./pages/CommunityInvite";
import GroupChat from "./pages/GroupChat";
import CourseView from "./pages/CourseView";
import CourseManagement from "./pages/CourseManagement";
import CreateCourse from "./pages/CreateCourse";
import Events from "./pages/Events";
import DevTools from "./pages/DevTools";
import Financial from "./pages/Financial";
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
          <main className="flex-1">
            <Routes>
              <Route path="/communities" element={<Communities />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/events" element={<Events />} />
              <Route path="/communities/:communityId/manage" element={<CommunityManagement />} />
              <Route path="/communities/:communityId/courses/new" element={<CreateCourse />} />
              <Route path="/groups/:groupId/chat" element={<GroupChat />} />
              <Route path="/courses/:courseId" element={<CourseView />} />
              <Route path="/courses/:courseId/manage" element={<CourseManagement />} />
              <Route path="/invite/:inviteCode" element={<CommunityInvite />} />
              <Route path="/dev-tools" element={<DevTools />} />
              <Route path="/financial" element={<Financial />} />
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
