'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function signoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function loginAction(email: string, password: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function signupAction(email: string, password: string, name: string, origin: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function verifyConnectionAction() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  console.log('Checking Supabase connection...')
  console.log('- URL:', supabaseUrl)
  console.log('- Key prefix:', supabaseKey ? supabaseKey.substring(0, 15) + '...' : 'undefined')

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
      headers: {
        apikey: supabaseKey!,
      },
    })
    
    console.log('- Response Status:', res.status, res.statusText)
    
    if (!res.ok) {
      const bodyText = await res.text()
      console.log('- Response Body:', bodyText)
      return { success: false, error: `Status ${res.status}: ${bodyText}` }
    }
    
    return { success: true }
  } catch (err: any) {
    console.error('- Connection Error:', err.message)
    return { success: false, error: err.message }
  }
}
