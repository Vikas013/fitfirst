import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user onboarding profile and default goals
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded, default_steps_goal, default_calories_goal, default_minutes_goal, default_water_goal')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.onboarded) {
    redirect('/onboarding')
  }

  const name = user.user_metadata?.full_name || 'Friend'

  return (
    <DashboardClient 
      name={name} 
      profileDefaults={{
        steps_goal: profile.default_steps_goal,
        calories_goal: profile.default_calories_goal,
        minutes_goal: profile.default_minutes_goal,
        water_goal: profile.default_water_goal
      }}
    />
  )
}
