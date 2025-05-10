
// Follow this setup guide to integrate the Deno runtime and use Edge Functions:
// https://deno.com/manual/runtime/edge_functions

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log('Creating admin user');

    // First, check if the admin user already exists in auth.users
    const { data: existingUsers, error: checkError } = await supabase.auth.admin.listUsers();
    
    if (checkError) {
      throw checkError;
    }

    // Check if the admin user already exists
    const adminExists = existingUsers.users.some(user => 
      user.email === 'admin@h4rithd.com' || 
      user.user_metadata?.username === 'admin'
    );

    if (adminExists) {
      // Even if admin exists, make sure their password is correct by updating it
      const adminUser = existingUsers.users.find(user => 
        user.email === 'admin@h4rithd.com' || 
        user.user_metadata?.username === 'admin'
      );
      
      if (adminUser) {
        // Update the admin user's password
        await supabase.auth.admin.updateUserById(adminUser.id, {
          password: 'password1234',
          email_confirm: true
        });
      }
      
      return new Response(
        JSON.stringify({ message: 'Admin user already exists and password updated' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the admin user with email/password
    const { data: adminUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'admin@h4rithd.com',
      password: 'password1234',
      email_confirm: true,
      user_metadata: { 
        username: 'admin',
        name: 'Harith Dilshan'
      },
      app_metadata: {
        role: 'admin'
      }
    });

    if (createError) {
      throw createError;
    }

    // Check if the admin user was created in the users table
    const { data: existingUserInTable } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'admin')
      .single();
      
    if (!existingUserInTable && adminUser.user) {
      // If not exists in the users table, insert it
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: adminUser.user.id,
          email: 'admin@h4rithd.com',
          name: 'Harith Dilshan',
          role: 'admin',
          username: 'admin'
        });
        
      if (insertError) {
        throw insertError;
      }
    } else if (existingUserInTable && adminUser.user) {
      // Make sure the ID matches
      const { error: updateError } = await supabase
        .from('users')
        .update({ id: adminUser.user.id })
        .eq('username', 'admin');

      if (updateError) {
        throw updateError;
      }
    }

    return new Response(
      JSON.stringify({ message: 'Admin user created successfully', user: adminUser }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating admin user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
