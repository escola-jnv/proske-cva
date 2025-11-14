import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventCard } from "@/components/EventCard";
import { CreateEventMenu } from "@/components/CreateEventMenu";
import { ArrowLeft, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { isFuture } from "date-fns";

type Event = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  duration_minutes: number;
  event_type: string;
  social_media_link: string | null;
  my_status: string;
  group_names: string[];
  created_by: string;
  community_id: string;
  study_status?: string;
};

const Events = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [defaultCommunityId, setDefaultCommunityId] = useState<string | null>(null);
  const [generatingStudies, setGeneratingStudies] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setUser(currentSession?.user ?? null);

      if (!currentSession?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);

      if (!session?.user) {
        navigate("/auth");
      } else {
        fetchEvents(session.user.id);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchEvents = async (userId: string) => {
    try {
      // Fetch user roles
      const rolesResponse: any = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      setUserRoles(rolesResponse.data?.map((r: any) => r.role) || []);

      // Fetch regular events
      const participantQuery: any = supabase.from("events");
      const participantResponse: any = await participantQuery
        .select("*, event_participants!inner(status), event_groups(conversation_groups(name))")
        .eq("event_participants.user_id", userId)
        .neq("event_type", "individual_study");

      if (participantResponse.error) throw participantResponse.error;

      // Fetch individual studies
      const studiesQuery: any = supabase.from("events");
      const studiesResponse: any = await studiesQuery
        .select("*")
        .eq("event_type", "individual_study")
        .eq("created_by", userId);

      if (studiesResponse.error) throw studiesResponse.error;

      // Combine
      const pEvents: any[] = participantResponse.data || [];
      const sEvents: any[] = studiesResponse.data || [];
      const combined = [...pEvents, ...sEvents];
      
      combined.sort((a, b) => 
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
      );

      const sortedEvents = combined;

      // Transform data
      const transformedEvents = sortedEvents.map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        event_date: event.event_date,
        duration_minutes: event.duration_minutes,
        event_type: event.event_type,
        social_media_link: event.social_media_link,
        created_by: event.created_by,
        community_id: event.community_id,
        study_status: event.study_status,
        my_status: event.event_participants?.[0]?.status || "pending",
        group_names: event.event_groups?.map((eg: any) => eg.conversation_groups?.name).filter(Boolean) || [],
      }));

      setEvents(transformedEvents);

      // Get default community for creating individual studies from user's communities
      const { data: communities } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", userId)
        .limit(1)
        .single();

      if (communities) {
        setDefaultCommunityId(communities.community_id);
      }
    
    } catch (error: any) {
      console.error("Error fetching events:", error);
      toast.error("Erro ao carregar eventos");
    }
  };

  const generateMonthlyStudies = async () => {
    if (!user?.id || !defaultCommunityId) {
      toast.error("Erro ao gerar estudos. Tente novamente.");
      return;
    }

    setGeneratingStudies(true);
    try {
      // Fetch user profile with study configuration
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("study_days, study_schedule")
        .eq("id", user.id)
        .single() as any;

      if (profileError) throw profileError;

      if (!profile?.study_days || profile.study_days.length === 0) {
        toast.error("Configure seus dias de estudo no perfil primeiro");
        setGeneratingStudies(false);
        return;
      }

      const studyDays = profile.study_days as number[];
      const studySchedule = (profile.study_schedule || {}) as Record<number, string>;

      // Get current month's start and end
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const monthStart = new Date(currentYear, currentMonth, 1);
      const monthEnd = new Date(currentYear, currentMonth + 1, 0);

      // Generate studies for configured days
      const eventsToCreate = [];
      for (let date = new Date(monthStart); date <= monthEnd; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();
        
        if (studyDays.includes(dayOfWeek)) {
          const currentDate = new Date(date);
          
          // Skip past dates
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          currentDate.setHours(0, 0, 0, 0);
          if (currentDate < today) continue;

          const timeStr = studySchedule[dayOfWeek] || "20:00";
          const [hours, minutes] = timeStr.split(":").map(Number);
          currentDate.setHours(hours, minutes, 0, 0);

          eventsToCreate.push({
            title: "Estudo Individual",
            description: "Estudo individual agendado",
            event_date: currentDate.toISOString(),
            duration_minutes: 60,
            event_type: "individual_study",
            study_topic: "Estudo programado",
            created_by: user.id,
            community_id: defaultCommunityId,
          });
        }
      }

      if (eventsToCreate.length === 0) {
        toast.info("Nenhum estudo para criar no mês atual");
        setGeneratingStudies(false);
        return;
      }

      // Insert all studies
      const { error: insertError } = await (supabase
        .from("events")
        .insert(eventsToCreate) as any);

      if (insertError) throw insertError;

      toast.success(`${eventsToCreate.length} estudos criados para este mês!`);
      fetchEvents(user.id);
    } catch (error) {
      console.error("Error generating studies:", error);
      toast.error("Erro ao gerar estudos automaticamente");
    } finally {
      setGeneratingStudies(false);
    }
  };

  const upcomingEvents = events.filter((e) => isFuture(new Date(e.event_date)));
  const pastEvents = events.filter((e) => !isFuture(new Date(e.event_date)));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <nav className="container mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/communities")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-medium">Agenda</h1>
            <p className="text-sm text-muted-foreground">
              Visualize e gerencie seus eventos
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!userRoles.includes('visitor') && defaultCommunityId && (
              <>
                <Button
                  onClick={generateMonthlyStudies}
                  disabled={generatingStudies || !defaultCommunityId}
                  variant="outline"
                  size="sm"
                >
                  {generatingStudies ? "Gerando..." : "Gerar Estudos do Mês"}
                </Button>
                <CreateEventMenu
                  communityId={defaultCommunityId}
                  userId={user?.id || ""}
                  isAdmin={userRoles.includes('admin')}
                  onSuccess={() => fetchEvents(user?.id || "")}
                />
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="upcoming" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="upcoming">
                Próximos ({upcomingEvents.length})
              </TabsTrigger>
              <TabsTrigger value="past">
                Passados ({pastEvents.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {upcomingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CalendarIcon className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum evento próximo</h3>
                  <p className="text-muted-foreground">
                    Quando você participar de eventos, eles aparecerão aqui
                  </p>
                </div>
              ) : (
                upcomingEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    userId={user?.id || ""}
                    userRoles={userRoles}
                    onUpdate={() => fetchEvents(user?.id || "")}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
              {pastEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CalendarIcon className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum evento passado</h3>
                  <p className="text-muted-foreground">
                    Eventos anteriores aparecerão aqui
                  </p>
                </div>
              ) : (
                pastEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    userId={user?.id || ""}
                    userRoles={userRoles}
                    onUpdate={() => fetchEvents(user?.id || "")}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Events;
