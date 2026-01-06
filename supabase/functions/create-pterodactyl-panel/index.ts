import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePanelRequest {
  username: string;
  email: string;
  password: string;
  serverId: string;
  ram: number;
  cpu: number;
  disk: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth error:', claimsError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log('User ID:', userId);

    const { username, email, password, serverId, ram, cpu, disk }: CreatePanelRequest = await req.json();
    console.log('Request data:', { username, email, serverId, ram, cpu, disk });

    // Get server details with API keys
    const { data: server, error: serverError } = await supabase
      .from('pterodactyl_servers')
      .select('*')
      .eq('id', serverId)
      .single();

    if (serverError || !server) {
      console.error('Server not found:', serverError);
      return new Response(
        JSON.stringify({ error: 'Server not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Server found:', server.name, server.domain);

    const pterodactylDomain = server.domain.replace(/\/$/, '');
    const pltaKey = server.plta_key; // Application API key
    const pltcKey = server.pltc_key; // Client API key

    // Step 1: Create user in Pterodactyl
    console.log('Creating user in Pterodactyl...');
    const createUserResponse = await fetch(`${pterodactylDomain}/api/application/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pltaKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        username: username,
        first_name: username,
        last_name: 'User',
        password: password,
      }),
    });

    let pteroUserId: number;
    
    if (!createUserResponse.ok) {
      const errorText = await createUserResponse.text();
      console.error('Pterodactyl user creation error:', errorText);
      
      // Check if user already exists (email or username conflict)
      if (createUserResponse.status === 422) {
        // Try to find existing user by email
        const findUserResponse = await fetch(`${pterodactylDomain}/api/application/users?filter[email]=${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${pltaKey}`,
            'Accept': 'application/json',
          },
        });
        
        if (findUserResponse.ok) {
          const findUserData = await findUserResponse.json();
          if (findUserData.data && findUserData.data.length > 0) {
            pteroUserId = findUserData.data[0].attributes.id;
            console.log('Found existing user:', pteroUserId);
          } else {
            return new Response(
              JSON.stringify({ error: 'User creation failed: username or email already in use' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ error: 'Failed to check existing user' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: `Pterodactyl API error: ${errorText}` }),
          { status: createUserResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      const userData = await createUserResponse.json();
      pteroUserId = userData.attributes.id;
      console.log('User created with ID:', pteroUserId);
    }

    // Step 2: Create server in Pterodactyl
    console.log('Creating server in Pterodactyl...');
    const createServerResponse = await fetch(`${pterodactylDomain}/api/application/servers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pltaKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        name: `${username}-server`,
        user: pteroUserId,
        egg: server.egg_id,
        docker_image: 'ghcr.io/pterodactyl/yolks:nodejs_18',
        startup: 'npm start',
        environment: {
          STARTUP_CMD: 'npm start',
        },
        limits: {
          memory: ram,
          swap: 0,
          disk: disk,
          io: 500,
          cpu: cpu,
        },
        feature_limits: {
          databases: 1,
          backups: 1,
          allocations: 1,
        },
        allocation: {
          default: 1,
        },
        deploy: {
          locations: [server.location_id],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });

    let pteroServerId: number | null = null;

    if (!createServerResponse.ok) {
      const errorText = await createServerResponse.text();
      console.error('Pterodactyl server creation error:', errorText);
      // Continue anyway - user is created, server creation might fail due to allocation issues
      console.log('Server creation failed, but user was created successfully');
    } else {
      const serverData = await createServerResponse.json();
      pteroServerId = serverData.attributes.id;
      console.log('Server created with ID:', pteroServerId);
    }

    // Step 3: Save to database
    console.log('Saving panel to database...');
    const { data: panelData, error: panelError } = await supabase
      .from('user_panels')
      .insert({
        user_id: userId,
        server_id: serverId,
        username: username,
        email: email,
        password: password,
        login_url: pterodactylDomain,
        ram: ram,
        cpu: cpu,
        disk: disk,
        ptero_user_id: pteroUserId,
        ptero_server_id: pteroServerId,
        is_active: true,
      })
      .select()
      .single();

    if (panelError) {
      console.error('Database error:', panelError);
      return new Response(
        JSON.stringify({ error: 'Failed to save panel to database', details: panelError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Panel saved successfully:', panelData.id);

    // Update profile panel count
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ panel_creations_count: 1 })
      .eq('user_id', userId);
    
    if (updateError) {
      console.error('Profile update error:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        panel: panelData,
        pteroUserId,
        pteroServerId,
        message: pteroServerId 
          ? 'Panel berhasil dibuat di Pterodactyl!' 
          : 'User berhasil dibuat di Pterodactyl. Server creation pending.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
