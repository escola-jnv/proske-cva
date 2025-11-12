-- Create events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  created_by UUID NOT NULL,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  google_calendar_event_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_groups table (many-to-many relationship)
CREATE TABLE public.event_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.conversation_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, group_id)
);

-- Create event_participants table
CREATE TABLE public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  google_calendar_invited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events
CREATE POLICY "Users can view events in their groups"
  ON public.events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_groups eg
      INNER JOIN public.group_members gm ON gm.group_id = eg.group_id
      WHERE eg.event_id = events.id AND gm.user_id = auth.uid()
    )
    OR created_by = auth.uid()
    OR has_role(auth.uid(), 'teacher'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their events"
  ON public.events FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Creators and admins can delete events"
  ON public.events FOR DELETE
  USING (
    auth.uid() = created_by 
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- RLS Policies for event_groups
CREATE POLICY "Users can view event groups"
  ON public.event_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_groups.event_id
      AND (
        e.created_by = auth.uid()
        OR has_role(auth.uid(), 'teacher'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

CREATE POLICY "Event creators can manage event groups"
  ON public.event_groups FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_groups.event_id
      AND e.created_by = auth.uid()
    )
  );

-- RLS Policies for event_participants
CREATE POLICY "Users can view event participants"
  ON public.event_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_participants.event_id
      AND (
        e.created_by = auth.uid()
        OR has_role(auth.uid(), 'teacher'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

CREATE POLICY "System can create participants"
  ON public.event_participants FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their participation status"
  ON public.event_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_event_participants_updated_at
  BEFORE UPDATE ON public.event_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();