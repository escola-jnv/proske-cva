import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBar } from "@/components/NotificationBar";
import { InterviewReminderDialog } from "@/components/InterviewReminderDialog";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import InstallApp from "./pages/InstallApp";
import Communities from "./pages/Communities";
import Profile from "./pages/Profile";
import CommunityGroups from "./pages/CommunityGroups";
import CommunityTasks from "./pages/CommunityTasks";
import CommunityEvents from "./pages/CommunityEvents";
import CommunityCourses from "./pages/CommunityCourses";
import GroupChat from "./pages/GroupChat";
import CourseView from "./pages/CourseView";
import CourseManagement from "./pages/CourseManagement";
import Events from "./pages/Events";
import Tasks from "./pages/Tasks";
import Plans from "./pages/Plans";
import DevTools from "./pages/DevTools";
import Financial from "./pages/Financial";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  
  const showSidebar = !["/", "/auth", "/install"].includes(location.pathname);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id || null;
      console.log("App.tsx - Setting userId:", uid);
      setUserId(uid);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const uid = session?.user?.id || null;
      console.log("App.tsx - Auth state changed, userId:", uid);
      setUserId(uid);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!showSidebar) {
    return (
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/install" element={<InstallApp />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <NotificationBar />
          <InterviewReminderDialog userId={userId} />
          {/* Mobile Sidebar Trigger - Persistente */}
          <div className="md:hidden sticky top-0 z-40 bg-background border-b border-border p-2 safe-area-inset-top">
            <SidebarTrigger />
          </div>
          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/communities" element={<Communities />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/events" element={<Events />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/communities/:communityId/groups" element={<CommunityGroups />} />
              <Route path="/communities/:communityId/tasks" element={<CommunityTasks />} />
              <Route path="/communities/:communityId/events" element={<CommunityEvents />} />
              <Route path="/communities/:communityId/courses" element={<CommunityCourses />} />
              <Route path="/communities/:communityId/courses/create" element={<CourseManagement />} />
              <Route path="/groups/:groupId/chat" element={<GroupChat />} />
              <Route path="/courses/:courseId" element={<CourseView />} />
              <Route path="/courses/:courseId/manage" element={<CourseManagement />} />
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
