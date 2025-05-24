
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, password, name, role } = await req.json()
    
    console.log('Creating admin user with:', { email, name, role })

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create the user in auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    })

    if (authError) {
      console.error('Auth error:', authError)
      throw authError
    }

    if (!authData.user) {
      throw new Error('User creation failed - no user returned')
    }

    console.log('User created in auth:', authData.user.id)

    // Insert user profile
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        first_login: false
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Don't throw here as the user might already exist in profiles
    }

    // Assign role in user_roles table
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: role || 'admin'
      })

    if (roleError) {
      console.error('Role assignment error:', roleError)
      // Don't throw here as the role might already be assigned
    }

    console.log('User created successfully')

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: authData.user.id, email, name, role } 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error creating admin user:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})