import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StudySchedule {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  time: string; // "HH:mm" format
  topic?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting scheduled studies creation...');

    // Get all users with study schedules configured
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, study_schedule, study_days')
      .not('study_schedule', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('No profiles with study schedules found');
      return new Response(
        JSON.stringify({ message: 'No profiles with study schedules found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${profiles.length} profiles with study schedules`);

    let totalCreated = 0;

    // Process each user
    for (const profile of profiles) {
      try {
        const userId = profile.id;
        const studySchedule = profile.study_schedule as StudySchedule[] | null;

        if (!studySchedule || !Array.isArray(studySchedule) || studySchedule.length === 0) {
          console.log(`Skipping user ${userId} - invalid study schedule`);
          continue;
        }

        // Get user's first community (for community_id)
        const { data: membership, error: membershipError } = await supabase
          .from('community_members')
          .select('community_id')
          .eq('user_id', userId)
          .limit(1)
          .single();

        if (membershipError || !membership) {
          console.log(`Skipping user ${userId} - no community membership`);
          continue;
        }

        const communityId = membership.community_id;

        // Create studies for the next 7 days
        const today = new Date();
        const studiesCreated: any[] = [];

        for (let i = 0; i < 7; i++) {
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + i);
          const dayOfWeek = targetDate.getDay(); // 0-6

          // Find schedules for this day of week
          const daySchedules = studySchedule.filter(s => s.dayOfWeek === dayOfWeek);

          for (const schedule of daySchedules) {
            const [hours, minutes] = schedule.time.split(':');
            const eventDateTime = new Date(targetDate);
            eventDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

            // Only create if the event is in the future
            if (eventDateTime <= new Date()) {
              continue;
            }

            // Check if event already exists for this time
            const { data: existingEvent } = await supabase
              .from('events')
              .select('id')
              .eq('created_by', userId)
              .eq('event_type', 'individual_study')
              .gte('event_date', eventDateTime.toISOString())
              .lt('event_date', new Date(eventDateTime.getTime() + 60000).toISOString())
              .maybeSingle();

            if (existingEvent) {
              console.log(`Event already exists for user ${userId} at ${eventDateTime.toISOString()}`);
              continue;
            }

            // Create the study event
            const studyData = {
              title: 'Estudo Individual',
              description: schedule.topic || 'Estudo agendado automaticamente',
              event_date: eventDateTime.toISOString(),
              duration_minutes: 60,
              event_type: 'individual_study',
              study_topic: schedule.topic || 'Estudo programado',
              created_by: userId,
              community_id: communityId,
            };

            studiesCreated.push(studyData);
          }
        }

        // Bulk insert studies for this user
        if (studiesCreated.length > 0) {
          const { error: insertError } = await supabase
            .from('events')
            .insert(studiesCreated);

          if (insertError) {
            console.error(`Error creating studies for user ${userId}:`, insertError);
          } else {
            console.log(`Created ${studiesCreated.length} studies for user ${userId}`);
            totalCreated += studiesCreated.length;
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${profile.id}:`, userError);
        // Continue with next user
      }
    }

    console.log(`Total studies created: ${totalCreated}`);

    return new Response(
      JSON.stringify({ 
        message: 'Scheduled studies created successfully',
        totalCreated,
        profilesProcessed: profiles.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in create-scheduled-studies:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
