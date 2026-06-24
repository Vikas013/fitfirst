import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Double-check if the user is already onboarded. If they are, redirect them to the dashboard.
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded')
    .eq('id', user.id)
    .single()

  if (profile?.onboarded) {
    redirect('/')
  }

  const name = user.user_metadata?.full_name || 'Friend'

  return <OnboardingClient name={name} userId={user.id} email={user.email || ''} />
}
