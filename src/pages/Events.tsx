import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EventCard } from "@/components/EventCard";
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
  my_status: string;
  group_names: string[];
  created_by: string;
  community_id: string;
};

const Events = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);

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
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      setUserRoles(rolesData?.map(r => r.role) || []);

      // Fetch events where user is a participant
      const { data: eventsData, error } = await supabase
        .from("events")
        .select(`
          id,
          title,
          description,
          event_date,
          duration_minutes,
          created_by,
          community_id,
          event_participants!inner(status),
          event_groups(
            conversation_groups(name)
          )
        `)
        .eq("event_participants.user_id", userId)
        .order("event_date", { ascending: true });

      if (error) throw error;

      // Transform data
      const transformedEvents = eventsData.map((event: any) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        event_date: event.event_date,
        duration_minutes: event.duration_minutes,
        created_by: event.created_by,
        community_id: event.community_id,
        my_status: event.event_participants[0]?.status || "pending",
        group_names: event.event_groups?.map((eg: any) => eg.conversation_groups?.name).filter(Boolean) || [],
      }));

      setEvents(transformedEvents);
    } catch (error: any) {
      console.error("Error fetching events:", error);
      toast.error("Erro ao carregar eventos");
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
                    Quando você for convidado para eventos, eles aparecerão aqui
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
