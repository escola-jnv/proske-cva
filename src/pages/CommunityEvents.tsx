import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "lucide-react";

type Event = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  duration_minutes: number;
  group_names: string[];
  participant_count: number;
};

export default function CommunityEvents() {
  const navigate = useNavigate();
  const { communityId } = useParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      if (communityId) {
        await fetchEvents(communityId);
      }
      setLoading(false);
    };

    checkAuthAndFetchData();
  }, [communityId, navigate]);

  const fetchEvents = async (commId: string) => {
    try {
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          event_date,
          duration_minutes,
          event_groups(
            conversation_groups(name)
          )
        `)
        .eq('community_id', commId)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(20);

      if (error) throw error;

      const eventsWithCounts = await Promise.all((eventsData || []).map(async (event: any) => {
        const { count } = await supabase
          .from('event_participants')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);

        return {
          id: event.id,
          title: event.title,
          description: event.description,
          event_date: event.event_date,
          duration_minutes: event.duration_minutes,
          group_names: event.event_groups?.map((eg: any) => eg.conversation_groups?.name).filter(Boolean) || [],
          participant_count: count || 0
        };
      }));

      setEvents(eventsWithCounts);
    } catch (error: any) {
      console.error("Error fetching events:", error);
    }
  };

  if (loading) return <div className="container mx-auto px-6 py-12">Carregando...</div>;

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-4xl mx-auto space-y-4">
        <h2 className="text-2xl font-medium">Agenda</h2>

        <div className="space-y-1">
          {events.map(event => {
            const eventDate = new Date(event.event_date);
            const formatDate = () => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              const eventDay = new Date(eventDate);
              eventDay.setHours(0, 0, 0, 0);

              if (eventDay.getTime() === today.getTime()) return "Hoje";
              if (eventDay.getTime() === tomorrow.getTime()) return "Amanhã";
              return eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            };

            const timeString = eventDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            return (
              <Card 
                key={event.id} 
                className="p-4 cursor-pointer hover:bg-accent transition-colors border-0 border-b rounded-none first:rounded-t-lg last:rounded-b-lg" 
                onClick={() => navigate(`/events?eventId=${event.id}`)}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Calendar className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-medium truncate">{event.title}</h3>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate()} {timeString}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {event.description || "Sem descrição"}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {event.duration_minutes} min
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {event.participant_count} {event.participant_count === 1 ? 'participante' : 'participantes'}
                      </Badge>
                      {event.group_names.map(name => (
                        <Badge key={name} variant="outline" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {events.length === 0 && (
            <Card className="p-12 flex flex-col items-center justify-center border-2 border-dashed">
              <Calendar className="h-12 w-12 mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-center">
                Nenhum evento agendado.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
