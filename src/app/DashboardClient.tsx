'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { signoutAction } from './login/actions'
import * as Sentry from '@sentry/nextjs'
import ReviewWorkspace, { DetectedMovement } from './ingest/ReviewWorkspace'
import { 
  Footprints, 
  Flame, 
  Activity, 
  Droplet, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Dumbbell, 
  Calendar, 
  Loader2, 
  X,
  PlusCircle,
  MessageSquare,
  Settings,
  Brain,
  Sparkles
} from 'lucide-react'

interface Workout {
  id: string
  activity_type: string
  duration: number
  calories_burned: number
  notes: string | null
  logged_at: string
}

interface DailyMetrics {
  steps: number
  steps_goal: number
  calories_goal: number
  active_minutes: number
  active_minutes_goal: number
  water_intake: number
  water_goal: number
}

// Utility to format date in YYYY-MM-DD local format
const formatDateString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Utility to format display date (e.g., "Today", "Yesterday", or "Monday, Jun 15")
const formatDisplayDate = (dateStr: string) => {
  const today = formatDateString(new Date())
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = formatDateString(yesterdayDate)

  if (dateStr === today) return 'Today'
  if (dateStr === yesterday) return 'Yesterday'

  const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' }
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', options)
}

// Activity display meta mapping
const ACTIVITY_META: Record<string, { label: string; icon: string; badgeClass: string }> = {
  running: { label: '🏃‍♂️ Running', icon: 'running', badgeClass: 'badge-running' },
  strength: { label: '🏋️‍♀️ Strength', icon: 'strength', badgeClass: 'badge-strength' },
  cycling: { label: '🚴‍♂️ Cycling', icon: 'cycling', badgeClass: 'badge-cycling' },
  yoga: { label: '🧘‍♂️ Yoga', icon: 'yoga', badgeClass: 'badge-yoga' },
  walking: { label: '🚶‍♂️ Walking', icon: 'walking', badgeClass: 'badge-walking' },
  other: { label: '💪 Workout', icon: 'other', badgeClass: 'badge-other' }
}

interface GeneratedRoutineItem {
  exercise_name: string
  canonical_id: string | null
  sets: number
  reps_range: string
  rest_seconds: number
}

interface GeneratedDay {
  day_name: string
  routine: GeneratedRoutineItem[]
}

interface GeneratedProgram {
  program_name: string
  days: GeneratedDay[]
}

interface DashboardClientProps {
  name: string
  profileDefaults: {
    steps_goal: number
    calories_goal: number
    minutes_goal: number
    water_goal: number
  }
}

export default function DashboardClient({ name, profileDefaults }: DashboardClientProps) {
  const router = useRouter()
  const supabase = createClient()

  // Selected date state (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(formatDateString(new Date()))

  // Dashboard metrics & workouts state
  const [metrics, setMetrics] = useState<DailyMetrics>({
    steps: 0,
    steps_goal: profileDefaults.steps_goal,
    calories_goal: profileDefaults.calories_goal,
    active_minutes: 0,
    active_minutes_goal: profileDefaults.minutes_goal,
    water_intake: 0,
    water_goal: profileDefaults.water_goal
  })
  const [workouts, setWorkouts] = useState<Workout[]>([])
  
  // Weekly progress for steps chart
  const [weeklySteps, setWeeklySteps] = useState<{ dayLabel: string; steps: number; goal: number }[]>([])

  // UI States
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submittingWorkout, setSubmittingWorkout] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ingest' | 'generator'>('dashboard')

  // AI Workout Generator States
  const [generatorPrompt, setGeneratorPrompt] = useState('')
  const [generatorLoading, setGeneratorLoading] = useState(false)
  const [generatorProgress, setGeneratorProgress] = useState('')
  const [generatedProgram, setGeneratedProgram] = useState<GeneratedProgram | null>(null)
  const [savingProgram, setSavingProgram] = useState(false)

  // Ingestion states
  const [ingestUrl, setIngestUrl] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [ingestLoading, setIngestLoading] = useState(false)
  const [ingestProgress, setIngestProgress] = useState(0)
  const [ingestError, setIngestError] = useState<string | null>(null)
  const [ingestionResult, setIngestionResult] = useState<{ detected_movements: DetectedMovement[] } | null>(null)
  const [submittingIngestion, setSubmittingIngestion] = useState(false)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [ingestSource, setIngestSource] = useState<'url' | 'file' | null>(null)

  // Settings Modal States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)

  // Settings Form States
  const [editGoal, setEditGoal] = useState('fitness')
  const [editActivity, setEditActivity] = useState('moderate')
  const [editUnits, setEditUnits] = useState<'metric' | 'imperial'>('metric')
  const [editGender, setEditGender] = useState('female')
  const [editDob, setEditDob] = useState('1995-01-01')
  
  const [editWeightKg, setEditWeightKg] = useState('70')
  const [editHeightCm, setEditHeightCm] = useState('175')
  
  const [editWeightLbs, setEditWeightLbs] = useState('154')
  const [editHeightFt, setEditHeightFt] = useState('5')
  const [editHeightIn, setEditHeightIn] = useState('9')

  const [editSteps, setEditSteps] = useState(profileDefaults.steps_goal)
  const [editCalories, setEditCalories] = useState(profileDefaults.calories_goal)
  const [editMinutes, setEditMinutes] = useState(profileDefaults.minutes_goal)
  const [editWater, setEditWater] = useState(profileDefaults.water_goal)

  // Form states for new workout
  const [newActivity, setNewActivity] = useState('running')
  const [newDuration, setNewDuration] = useState('30')
  const [newCalories, setNewCalories] = useState('250')
  const [newNotes, setNewNotes] = useState('')

  // Sign out function
  const handleSignOut = async () => {
    Sentry.setUser(null); // Clear Sentry user identity
    await signoutAction()
  }

  // Drag and Drop Ingestion Helpers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.mov')) {
        setSelectedFile(file)
      } else {
        setIngestError("Invalid file type: Please upload a .mp4 or .mov video file.")
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.mov')) {
        setSelectedFile(file)
      } else {
        setIngestError("Invalid file type: Please upload a .mp4 or .mov video file.")
      }
    }
  }

  // progressive loader timer helper
  const startProgressAnimation = () => {
    setIngestProgress(0)
    const duration = 3000
    const intervalTime = 50
    const step = 100 / (duration / intervalTime)
    
    const timer = setInterval(() => {
      setIngestProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer)
          return 100
        }
        return prev + step
      })
    }, intervalTime)
    
    return timer
  }

  // unified Ingest API caller
  const handleIngest = async (sourceType: 'url' | 'file', testFile?: File) => {
    setIngestError(null)
    setIngestLoading(true)
    setIngestSource(sourceType)
    
    const progressTimer = startProgressAnimation()
    
    try {
      let response;
      if (sourceType === 'url') {
        if (!ingestUrl.trim()) {
          throw new Error("Please paste a valid video URL.")
        }
        response = await fetch('/api/ingest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ videoUrl: ingestUrl, supabasePath: null }),
        })
      } else {
        const fileToUpload = testFile || selectedFile
        if (!fileToUpload) {
          throw new Error("Please select or drop a video file.")
        }
        if (!userId) {
          throw new Error("Session expired. Please log in again to upload videos.")
        }

        // 1. Upload the local video file to Supabase Storage staging bucket
        const filePath = `${userId}/${Date.now()}-${fileToUpload.name}`
        const { error: uploadErr } = await supabase.storage
          .from('fitness-ingestion-staging')
          .upload(filePath, fileToUpload, {
            cacheControl: '3600',
            upsert: false
          })
        
        if (uploadErr) {
          throw new Error(`Storage upload failed: ${uploadErr.message}`)
        }

        // 2. Generate a signed URL with 5 minutes (300 seconds) of temporary access
        const { data: signedData, error: signedErr } = await supabase.storage
          .from('fitness-ingestion-staging')
          .createSignedUrl(filePath, 300)

        if (signedErr || !signedData?.signedUrl) {
          // Cleanup uploaded file on failure to get signed URL
          await supabase.storage.from('fitness-ingestion-staging').remove([filePath])
          throw new Error(`Failed to generate video access link: ${signedErr?.message || 'unknown error'}`)
        }

        // 3. POST unified JSON payload to backend route
        response = await fetch('/api/ingest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoUrl: signedData.signedUrl,
            supabasePath: filePath
          }),
        })
      }
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`)
      }

      if (!data.detected_movements || data.detected_movements.length === 0) {
        throw new Error("We couldn't detect any structured fitness exercises in this video. Please ensure your link features workout or physical training sequences.")
      }
      
      setIngestProgress(100)
      console.log('Ingestion completed successfully! JSON data:', data)
      setIngestionResult(data)
    } catch (err) {
      console.error('Ingestion failed:', err)
      Sentry.captureException(err)
      setIngestError(err instanceof Error ? err.message : "An unexpected error occurred during video analysis.")
    } finally {
      clearInterval(progressTimer)
      setIngestLoading(false)
      setIngestSource(null)
    }
  }

  // Save ingestion validated movements to Supabase
  const handleCommitIngestion = async (validatedMovements: DetectedMovement[]) => {
    if (!userId) return

    Sentry.addBreadcrumb({
      category: 'user.action',
      message: `User committing ${validatedMovements.length} movements to catalog`,
      level: 'info'
    })

    setSubmittingIngestion(true)
    setIngestError(null)

    try {
      let totalDuration = 0

      // Insert workouts one by one
      for (const movement of validatedMovements) {
        const durationSeconds = movement.timestamp_range[1] - movement.timestamp_range[0]
        const durationMin = Math.max(1, Math.round(durationSeconds / 60))
        totalDuration += durationMin

        // Estimate calories (e.g. 6 kcal per minute for strength training)
        const caloriesBurned = Math.max(10, durationMin * 6)

        // Format detailed notes
        const notesLines = [
          `Exercise: ${movement.exercise_name_raw}`,
          `Target Muscles: ${movement.primary_muscles.join(', ')}`,
          `Equipment: ${movement.equipment.join(', ')}`
        ]

        if (movement.coaching_cues && movement.coaching_cues.length > 0) {
          notesLines.push('\nCoaching Cues:')
          movement.coaching_cues.forEach(cue => notesLines.push(`- ${cue}`))
        }

        if (movement.safety_precautions && movement.safety_precautions.length > 0) {
          notesLines.push('\nSafety Precautions:')
          movement.safety_precautions.forEach(prec => notesLines.push(`- ${prec}`))
        }

        const notes = notesLines.join('\n')

        // Insert into Supabase
        const { error: insertErr } = await supabase
          .from('workouts')
          .insert({
            user_id: userId,
            activity_type: 'strength',
            duration: durationMin,
            calories_burned: caloriesBurned,
            notes: notes,
            logged_at: `${selectedDate}T${new Date().toISOString().split('T')[1]}`,
            canonical_id: movement.match_profile?.canonical_id || null
          })

        if (insertErr) throw insertErr
      }

      // Update today's daily metrics (active minutes)
      const newActiveMinutes = metrics.active_minutes + totalDuration
      const { error: metricsErr } = await supabase
        .from('daily_metrics')
        .upsert(
          { user_id: userId, date: selectedDate, active_minutes: newActiveMinutes },
          { onConflict: 'user_id,date' }
        )

      if (metricsErr) throw metricsErr

      // Update local state to refresh dashboard metrics immediately
      setMetrics(prev => ({ ...prev, active_minutes: newActiveMinutes }))

      // Fetch updated dashboard data
      fetchDashboardData()

      // Reset ingestion state
      setIngestionResult(null)
      setIngestUrl('')
      setSelectedFile(null)

      // Show success toast notification
      setSuccessToast(`Successfully committed ${validatedMovements.length} movements to your catalog!`)
      setTimeout(() => setSuccessToast(null), 5000)

    } catch (err) {
      console.error('Failed to commit ingestion:', err)
      Sentry.captureException(err)
      setIngestError(err instanceof Error ? err.message : 'Failed to save movements to your catalog. Please try again.')
    } finally {
      setSubmittingIngestion(false)
    }
  }

  // Call AI Program Generator Endpoint
  const handleGenerateProgram = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!generatorPrompt.trim()) return

    setGeneratorLoading(true)
    setIngestError(null)
    setGeneratedProgram(null)
    setGeneratorProgress('Consulting your exercise catalog...')

    // Setup progressive messages timer
    const progressStages = [
      'Retrieving logged exercise naming conventions...',
      'Mapping available equipment sets...',
      'Structuring multi-day routine splits...',
      'Optimizing rep ranges and target sets...',
      'Verifying recovery intervals...'
    ]
    let stageIdx = 0
    const interval = setInterval(() => {
      if (stageIdx < progressStages.length) {
        setGeneratorProgress(progressStages[stageIdx])
        stageIdx++
      }
    }, 2500)

    try {
      const response = await fetch('/api/generate-program', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: generatorPrompt })
      })

      const data = await response.json()
      clearInterval(interval)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate program.')
      }

      setGeneratedProgram(data)
    } catch (err: unknown) {
      clearInterval(interval)
      const msg = err instanceof Error ? err.message : String(err)
      setIngestError(`Generation Error: ${msg}`)
      Sentry.captureException(err)
    } finally {
      setGeneratorLoading(false)
    }
  }

  // Batch-insert generated split routine into workouts schedule
  const handleSaveProgram = async () => {
    if (!generatedProgram || !userId) return
    setSavingProgram(true)
    setIngestError(null)

    try {
      let currentDayOffset = 0
      const dateObj = new Date(selectedDate)

      for (const day of generatedProgram.days) {
        const targetDate = new Date(dateObj)
        targetDate.setDate(targetDate.getDate() + currentDayOffset)
        const formattedTargetDate = targetDate.toISOString().split('T')[0]

        for (const item of day.routine) {
          const notes = [
            `Exercise: ${item.exercise_name}`,
            `Sets: ${item.sets}`,
            `Reps: ${item.reps_range}`,
            `Rest: ${item.rest_seconds} seconds`,
            `AI Program Split - Scheduled for ${day.day_name}`
          ].join('\n')

          const { error } = await supabase
            .from('workouts')
            .insert({
              user_id: userId,
              activity_type: 'strength',
              duration: 45,
              calories_burned: 250,
              notes: notes,
              logged_at: `${formattedTargetDate}T10:00:00.000Z`,
              canonical_id: item.canonical_id || null
            })

          if (error) throw error
        }
        currentDayOffset++
      }

      setSuccessToast(`Successfully scheduled "${generatedProgram.program_name}" program over next ${generatedProgram.days.length} days!`)
      setTimeout(() => setSuccessToast(null), 5000)
      
      // Reset forms and navigate back to dashboard
      setGeneratedProgram(null)
      setGeneratorPrompt('')
      fetchDashboardData()
      setActiveTab('dashboard')
    } catch (err: unknown) {
      console.error('Failed to save program schedule:', err)
      setIngestError('Failed to save generated program to your schedule.')
      Sentry.captureException(err)
    } finally {
      setSavingProgram(false)
    }
  }

  // Get current user ID on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        
        // Bind user details to Sentry session
        Sentry.setUser({
          id: user.id,
          email: user.email,
          username: user.user_metadata?.full_name || 'Friend'
        })
      } else {
        router.push('/login')
      }
    }
    getUser()
  }, [])

  // Fetch all dashboard data when selected date or user changes
  useEffect(() => {
    if (!userId) return
    fetchDashboardData()
  }, [userId, selectedDate])

  async function fetchDashboardData() {
    setLoading(true)
    try {
      // 1. Fetch or initialize daily metrics row
      let metricsData = null
      const { data: fetchedMetricsData, error: metricsError } = await supabase
        .from('daily_metrics')
        .select('*')
        .eq('user_id', userId)
        .eq('date', selectedDate)
        .single()
      metricsData = fetchedMetricsData

      if (metricsError && metricsError.code === 'PGRST116') {
        // Record doesn't exist yet, insert a default one
        const defaultMetric = {
          user_id: userId,
          date: selectedDate,
          steps: 0,
          steps_goal: profileDefaults.steps_goal,
          calories_goal: profileDefaults.calories_goal,
          active_minutes: 0,
          active_minutes_goal: profileDefaults.minutes_goal,
          water_intake: 0,
          water_goal: profileDefaults.water_goal
        }
        
        const { data: newMetrics, error: insertError } = await supabase
          .from('daily_metrics')
          .insert(defaultMetric)
          .select()
          .single()

        if (!insertError && newMetrics) {
          metricsData = newMetrics
        }
      }

      if (metricsData) {
        setMetrics({
          steps: metricsData.steps,
          steps_goal: metricsData.steps_goal,
          calories_goal: metricsData.calories_goal,
          active_minutes: metricsData.active_minutes,
          active_minutes_goal: metricsData.active_minutes_goal,
          water_intake: metricsData.water_intake,
          water_goal: metricsData.water_goal
        })
      }

      // 2. Fetch workouts for the selected date
      const startOfDay = `${selectedDate}T00:00:00.000Z`
      const endOfDay = `${selectedDate}T23:59:59.999Z`

      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId)
        .gte('logged_at', startOfDay)
        .lte('logged_at', endOfDay)
        .order('logged_at', { ascending: false })

      if (!workoutsError && workoutsData) {
        setWorkouts(workoutsData)
      }

      // 3. Fetch weekly history for steps progress chart
      const datesList = getPast7Dates(selectedDate)
      const { data: weeklyData, error: weeklyError } = await supabase
        .from('daily_metrics')
        .select('date, steps, steps_goal')
        .eq('user_id', userId)
        .in('date', datesList)

      if (!weeklyError && weeklyData) {
        const mappedWeekly = datesList.map(dateStr => {
          const matched = weeklyData.find(w => w.date === dateStr)
          const d = new Date(dateStr + 'T12:00:00')
          const dayLabel = d.toLocaleDateString('en-US', { weekday: 'narrow' }) // e.g. "M", "T"
          return {
            dayLabel,
            steps: matched ? matched.steps : 0,
            goal: matched ? matched.steps_goal : profileDefaults.steps_goal
          }
        })
        setWeeklySteps(mappedWeekly)
      }

    } catch (err) {
      Sentry.captureException(err)
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Generate list of 7 dates leading up to the target date
  const getPast7Dates = (targetDateStr: string) => {
    const dates = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(targetDateStr + 'T12:00:00')
      d.setDate(d.getDate() - i)
      dates.push(formatDateString(d))
    }
    return dates
  }

  // Increment steps (+1000 steps)
  const handleAddSteps = async () => {
    if (!userId) return
    
    Sentry.addBreadcrumb({
      category: 'user.action',
      message: 'User logged +1,000 steps',
      level: 'info'
    })

    const newSteps = metrics.steps + 1000
    
    // Optimistic UI update
    setMetrics(prev => ({ ...prev, steps: newSteps }))
    
    // Update weekly steps chart state immediately for instant feedback
    setWeeklySteps(prev => {
      const updated = [...prev]
      if (updated.length > 0) {
        // The last element represents today / selected date
        updated[updated.length - 1].steps += 1000
      }
      return updated
    })

    const { error } = await supabase
      .from('daily_metrics')
      .upsert(
        { user_id: userId, date: selectedDate, steps: newSteps },
        { onConflict: 'user_id,date' }
      )

    if (error) {
      Sentry.captureException(error)
      console.error('Error updating steps:', error.message)
      // Rollback on error
      fetchDashboardData()
    }
  }

  // Increment water (+1 Cup)
  const handleAddWater = async () => {
    if (!userId) return
    
    Sentry.addBreadcrumb({
      category: 'user.action',
      message: 'User logged +1 cup water',
      level: 'info'
    })

    const newWater = metrics.water_intake + 1
    
    // Optimistic UI update
    setMetrics(prev => ({ ...prev, water_intake: newWater }))

    const { error } = await supabase
      .from('daily_metrics')
      .upsert(
        { user_id: userId, date: selectedDate, water_intake: newWater },
        { onConflict: 'user_id,date' }
      )

    if (error) {
      Sentry.captureException(error)
      console.error('Error updating water:', error.message)
      // Rollback
      fetchDashboardData()
    }
  }

  // Log workout form submission
  const handleLogWorkout = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    
    Sentry.addBreadcrumb({
      category: 'user.action',
      message: `User logging workout: ${newActivity} for ${newDuration} mins`,
      level: 'info'
    })

    setSubmittingWorkout(true)

    const durationNum = parseInt(newDuration) || 0
    const caloriesNum = parseInt(newCalories) || 0
    
    // Calculate new active minutes
    const newActiveMinutes = metrics.active_minutes + durationNum

    try {
      // 1. Insert workout
      const { data: newWorkoutData, error: workoutErr } = await supabase
        .from('workouts')
        .insert({
          user_id: userId,
          activity_type: newActivity,
          duration: durationNum,
          calories_burned: caloriesNum,
          notes: newNotes || null,
          logged_at: `${selectedDate}T${new Date().toISOString().split('T')[1]}` // Sync with selected date
        })
        .select()
        .single()

      if (workoutErr) throw workoutErr

      // 2. Update active minutes in daily metrics
      const { error: metricsErr } = await supabase
        .from('daily_metrics')
        .upsert(
          { user_id: userId, date: selectedDate, active_minutes: newActiveMinutes },
          { onConflict: 'user_id,date' }
        )

      if (metricsErr) throw metricsErr

      // Update UI state
      setWorkouts(prev => [newWorkoutData, ...prev])
      setMetrics(prev => ({ ...prev, active_minutes: newActiveMinutes }))
      
      // Close modal and reset form
      setIsModalOpen(false)
      setNewNotes('')
      setNewDuration('30')
      setNewCalories('250')

    } catch (err) {
      Sentry.captureException(err)
      alert(`Failed to save workout: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSubmittingWorkout(false)
    }
  }

  // Fetch full user profile and open settings form
  const openSettings = async () => {
    setIsSettingsOpen(true)
    setSettingsLoading(true)
    
    Sentry.addBreadcrumb({
      category: 'user.action',
      message: 'User opened settings modal',
      level: 'info'
    })

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (!error && data) {
        setEditGoal(data.primary_goal || 'fitness')
        setEditActivity(data.activity_level || 'moderate')
        setEditUnits(data.unit_system || 'metric')
        setEditGender(data.gender || 'female')
        setEditDob(data.date_of_birth || '1995-01-01')
        
        setEditSteps(data.default_steps_goal)
        setEditCalories(data.default_calories_goal)
        setEditMinutes(data.default_minutes_goal)
        setEditWater(data.default_water_goal)

        if (data.unit_system === 'metric') {
          setEditWeightKg(String(data.weight || 70))
          setEditHeightCm(String(data.height || 175))
          const lbs = Math.round(data.weight * 2.20462)
          setEditWeightLbs(String(lbs))
          const totalInches = Math.round(data.height / 2.54)
          setEditHeightFt(String(Math.floor(totalInches / 12)))
          setEditHeightIn(String(totalInches % 12))
        } else {
          setEditWeightLbs(String(Math.round((data.weight || 70) * 2.20462)))
          const totalInches = Math.round((data.height || 175) / 2.54)
          setEditHeightFt(String(Math.floor(totalInches / 12)))
          setEditHeightIn(String(totalInches % 12))
          setEditWeightKg(String(data.weight || 70))
          setEditHeightCm(String(data.height || 175))
        }
      }
    } catch (err) {
      Sentry.captureException(err)
      console.error("Error loading profile:", err)
    } finally {
      setSettingsLoading(false)
    }
  }

  // Suggest settings targets based on current form metrics
  const handleRecalculateSuggestions = () => {
    const w = editUnits === 'metric' ? parseFloat(editWeightKg) || 70 : (parseFloat(editWeightLbs) || 154) * 0.45359237
    
    let recSteps = 10000
    if (editActivity === 'sedentary') recSteps = 6000
    else if (editActivity === 'light') recSteps = 8000
    else if (editActivity === 'moderate') recSteps = 10000
    else if (editActivity === 'active') recSteps = 12000

    let recCalories = 500
    if (editGoal === 'lose_weight') recCalories = Math.round(w * 8)
    else if (editGoal === 'build_muscle') recCalories = Math.round(w * 6)
    else if (editGoal === 'endurance') recCalories = Math.round(w * 10)
    else recCalories = Math.round(w * 7)
    recCalories = Math.max(250, Math.min(1500, recCalories))

    let recMinutes = 60
    if (editActivity === 'sedentary') recMinutes = 30
    else if (editActivity === 'light') recMinutes = 45
    else if (editActivity === 'moderate') recMinutes = 60
    else if (editActivity === 'active') recMinutes = 90

    let recWater = 8
    if (w > 80) recWater += 1
    if (w > 100) recWater += 1
    if (editActivity === 'active') recWater += 1

    setEditSteps(recSteps)
    setEditCalories(recCalories)
    setEditMinutes(recMinutes)
    setEditWater(recWater)
  }

  // Save profile and update current daily metrics
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    
    Sentry.addBreadcrumb({
      category: 'user.action',
      message: 'User saving profile settings changes',
      level: 'info'
    })

    setSettingsLoading(true)

    let finalWeight = parseFloat(editWeightKg) || 70
    let finalHeight = parseFloat(editHeightCm) || 175

    if (editUnits === 'imperial') {
      const lbs = parseFloat(editWeightLbs) || 154
      finalWeight = Math.round(lbs * 0.45359237 * 10) / 10
      const feet = parseFloat(editHeightFt) || 5
      const inches = parseFloat(editHeightIn) || 9
      finalHeight = Math.round((feet * 12 + inches) * 2.54 * 10) / 10
    }

    try {
      // 1. Update Profile
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          unit_system: editUnits,
          height: finalHeight,
          weight: finalWeight,
          activity_level: editActivity,
          primary_goal: editGoal,
          gender: editGender,
          date_of_birth: editDob,
          default_steps_goal: editSteps,
          default_calories_goal: editCalories,
          default_minutes_goal: editMinutes,
          default_water_goal: editWater,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (profileErr) throw profileErr

      // 2. Update today's daily metrics goals
      const { error: metricsErr } = await supabase
        .from('daily_metrics')
        .upsert(
          {
            user_id: userId,
            date: selectedDate,
            steps_goal: editSteps,
            calories_goal: editCalories,
            active_minutes_goal: editMinutes,
            water_goal: editWater
          },
          { onConflict: 'user_id,date' }
        )

      if (metricsErr) throw metricsErr

      // 3. Update dashboard UI state
      setMetrics(prev => ({
        ...prev,
        steps_goal: editSteps,
        calories_goal: editCalories,
        active_minutes_goal: editMinutes,
        water_goal: editWater
      }))

      // Close modal
      setIsSettingsOpen(false)

    } catch (err) {
      Sentry.captureException(err)
      alert(`Failed to save settings: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSettingsLoading(false)
    }
  }

  // Date Shift Helpers
  const shiftDate = (amount: number) => {
    const current = new Date(selectedDate + 'T12:00:00')
    current.setDate(current.getDate() + amount)
    
    const today = new Date()
    // Don't allow scrolling to future dates
    if (current > today && amount > 0) return

    setSelectedDate(formatDateString(current))
  }

  const isNextDayDisabled = () => {
    const current = new Date(selectedDate + 'T12:00:00')
    const today = new Date()
    return current.toDateString() === today.toDateString()
  }

  // Dynamic calculations
  const totalWorkoutCalories = workouts.reduce((sum, w) => sum + w.calories_burned, 0)
  const stepsPercent = Math.min(Math.round((metrics.steps / metrics.steps_goal) * 100), 100)
  const caloriesPercent = Math.min(Math.round((totalWorkoutCalories / metrics.calories_goal) * 100), 100)
  const minutesPercent = Math.min(Math.round((metrics.active_minutes / metrics.active_minutes_goal) * 100), 100)
  const waterPercent = Math.min(Math.round((metrics.water_intake / metrics.water_goal) * 100), 100)

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-container">
        
        {/* Header */}
        <header className="dashboard-header">
          <div className="dashboard-header-left">
            <h1>Hi, <span className="gradient-text">{name}</span> 👋</h1>
            <p>Ready to crush your goals today?</p>
          </div>
          
          <div className="dashboard-header-right">
            {/* Date Navigator */}
            <div className="date-navigator">
              <button onClick={() => shiftDate(-1)} className="date-nav-btn" aria-label="Previous day">
                <ChevronLeft size={18} />
              </button>
              <span className="date-display">{formatDisplayDate(selectedDate)}</span>
              <button 
                onClick={() => shiftDate(1)} 
                className="date-nav-btn" 
                disabled={isNextDayDisabled()}
                style={{ opacity: isNextDayDisabled() ? 0.3 : 1, cursor: isNextDayDisabled() ? 'not-allowed' : 'pointer' }}
                aria-label="Next day"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Settings */}
            <button onClick={openSettings} className="signout-btn" aria-label="Settings" style={{ marginRight: '0.5rem' }}>
              <Settings size={16} className="settings-gear" style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline' }} />
              Settings
            </button>

            {/* Logout */}
            <button onClick={handleSignOut} className="signout-btn" aria-label="Sign out">
              <LogOut size={16} style={{ marginRight: '6px', verticalAlign: 'middle', display: 'inline' }} />
              Sign Out
            </button>
          </div>
        </header>

        <nav className="tabs-navigation">
          <button 
            type="button"
            onClick={() => setActiveTab('dashboard')} 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            Dashboard Overview
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('ingest')} 
            className={`tab-btn ${activeTab === 'ingest' ? 'active' : ''}`}
          >
            Video Ingestion
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('generator')} 
            className={`tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
          >
            AI Workout Generator
          </button>
        </nav>

        {activeTab === 'dashboard' ? (
          loading ? (
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4rem auto', width: '100%', maxWidth: '400px' }}>
              <Loader2 className="animate-spin" size={40} style={{ color: '#8b5cf6', marginBottom: '1rem' }} />
              <p className="gradient-text" style={{ fontWeight: 600 }}>Syncing fitness metrics...</p>
            </div>
          ) : (
            <>
            {/* Grid of Stats Cards */}
            <section className="dashboard-grid">
              
              {/* Steps Card */}
              <div className="glass-card stat-card">
                <div className="stat-card-header">
                  <div className="stat-icon-wrapper stat-icon-steps">
                    <Footprints size={24} />
                  </div>
                  <span className="stat-title">Steps</span>
                </div>
                <div className="stat-card-body">
                  <span className="stat-value">{metrics.steps.toLocaleString()}</span>
                  <span className="stat-target">Goal: {metrics.steps_goal.toLocaleString()} steps</span>
                  <div className="progress-container">
                    <div className="progress-bar progress-bar-steps" style={{ width: `${stepsPercent}%` }}></div>
                  </div>
                </div>
                <button onClick={handleAddSteps} className="quick-action-btn">
                  <Plus size={14} />
                  1,000 Steps
                </button>
              </div>

              {/* Active Calories Card */}
              <div className="glass-card stat-card">
                <div className="stat-card-header">
                  <div className="stat-icon-wrapper stat-icon-calories">
                    <Flame size={24} />
                  </div>
                  <span className="stat-title">Active Calories</span>
                </div>
                <div className="stat-card-body">
                  <span className="stat-value">{totalWorkoutCalories} <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>kcal</span></span>
                  <span className="stat-target">Goal: {metrics.calories_goal} kcal</span>
                  <div className="progress-container">
                    <div className="progress-bar progress-bar-calories" style={{ width: `${caloriesPercent}%` }}></div>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="quick-action-btn">
                  <Plus size={14} />
                  Log Workout
                </button>
              </div>

              {/* Active Minutes Card */}
              <div className="glass-card stat-card">
                <div className="stat-card-header">
                  <div className="stat-icon-wrapper stat-icon-minutes">
                    <Activity size={24} />
                  </div>
                  <span className="stat-title">Active Minutes</span>
                </div>
                <div className="stat-card-body">
                  <span className="stat-value">{metrics.active_minutes} <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>mins</span></span>
                  <span className="stat-target">Goal: {metrics.active_minutes_goal} mins</span>
                  <div className="progress-container">
                    <div className="progress-bar progress-bar-minutes" style={{ width: `${minutesPercent}%` }}></div>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="quick-action-btn">
                  <Plus size={14} />
                  Log Exercise
                </button>
              </div>

              {/* Water Card */}
              <div className="glass-card stat-card">
                <div className="stat-card-header">
                  <div className="stat-icon-wrapper stat-icon-water">
                    <Droplet size={24} />
                  </div>
                  <span className="stat-title">Hydration</span>
                </div>
                <div className="stat-card-body">
                  <span className="stat-value">{metrics.water_intake} <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>cups</span></span>
                  <span className="stat-target">Goal: {metrics.water_goal} cups (2L)</span>
                  <div className="progress-container">
                    <div className="progress-bar progress-bar-water" style={{ width: `${waterPercent}%` }}></div>
                  </div>
                </div>
                <button onClick={handleAddWater} className="quick-action-btn">
                  <Plus size={14} />
                  1 Cup (250ml)
                </button>
              </div>

            </section>

            {/* Bottom Panels (Weekly Chart & Workouts List) */}
            <section className="dashboard-section-grid">
              
              {/* Weekly Steps Progress Chart */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <div className="panel-header">
                  <h2 className="panel-title">Weekly Steps Summary</h2>
                  <Calendar size={18} style={{ color: '#94a3b8' }} />
                </div>
                
                <div className="chart-container">
                  {weeklySteps.map((day, idx) => {
                    const barPercent = Math.min(Math.round((day.steps / day.goal) * 100), 100)
                    return (
                      <div key={idx} className="chart-bar-wrapper">
                        <div 
                          className="chart-bar-bg" 
                          title={`${day.steps.toLocaleString()} / ${day.goal.toLocaleString()} steps`}
                        >
                          <div 
                            className="chart-bar-fill" 
                            style={{ height: `${barPercent}%` }}
                          ></div>
                        </div>
                        <span className="chart-label">{day.dayLabel}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Today's Logged Workouts */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <div className="panel-header">
                  <h2 className="panel-title">{"Today's Workouts"}</h2>
                  <button onClick={() => setIsModalOpen(true)} className="add-workout-btn">
                    <PlusCircle size={15} />
                    Add Workout
                  </button>
                </div>

                <div className="workouts-list">
                  {workouts.length === 0 ? (
                    <div className="empty-state">
                      <Dumbbell size={32} style={{ color: '#475569', marginBottom: '0.75rem', opacity: 0.5 }} />
                      <p>No workouts logged for this day.</p>
                    </div>
                  ) : (
                    workouts.map((workout) => {
                      const activityInfo = ACTIVITY_META[workout.activity_type] || ACTIVITY_META.other
                      return (
                        <div key={workout.id} className="workout-item">
                          <div className="workout-info-left">
                            <span className={`workout-badge ${activityInfo.badgeClass}`}>
                              {activityInfo.label.split(' ')[0]}
                            </span>
                            <div className="workout-details">
                              <span className="workout-meta">
                                {activityInfo.label.split(' ').slice(1).join(' ')}
                              </span>
                              {workout.notes && (
                                <span className="workout-notes" title={workout.notes}>
                                  <MessageSquare size={10} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                                  {workout.notes.length > 25 ? `${workout.notes.substring(0, 25)}...` : workout.notes}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="workout-info-right">
                            <span className="workout-stats">{workout.duration} mins</span>
                            <span>{workout.calories_burned} kcal</span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

            </section>
          </>
        )
      ) : (
          /* Render Ingestion View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', width: '100%' }}>
            
            {/* Title / Description */}
            <div className="dashboard-header-left">
              <h2>Video Ingestion Engine</h2>
              <p>Convert YouTube, Instagram Reels, and TikTok videos into structured, trackable workout steps instantly using multimodal AI.</p>
            </div>

            {/* Ingestion Success Toast Banner */}
            {successToast && (
              <div className="success-message" style={{ width: '100%', marginBottom: '0.5rem', fontSize: '0.95rem', padding: '1rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>✓</span>
                <span>{successToast}</span>
              </div>
            )}

            {/* Ingestion Error Alert Banner */}
            {ingestError && (
              <div className="alert-banner">
                <div style={{ color: '#ef4444', marginTop: '2px' }}>
                  <X size={18} />
                </div>
                <div className="alert-banner-content">
                  <div className="alert-banner-title">Ingestion Error</div>
                  <div className="alert-banner-desc">{ingestError}</div>
                </div>
                <button onClick={() => setIngestError(null)} className="alert-banner-dismiss" aria-label="Dismiss error">
                  <X size={16} />
                </button>
              </div>
            )}

            {ingestionResult ? (
              <ReviewWorkspace
                key={ingestionResult ? JSON.stringify(ingestionResult.detected_movements) : 'empty'}
                result={ingestionResult}
                videoUrl={ingestUrl}
                selectedFile={selectedFile}
                onCancel={() => {
                  setIngestionResult(null)
                  setIngestUrl('')
                  setSelectedFile(null)
                }}
                onCommit={handleCommitIngestion}
                isSubmitting={submittingIngestion}
              />
            ) : ingestLoading ? (
              /* PROGRESSIVE MULTI-STAGE SKELETON LOADER */
              <div className="glass-card loader-card" style={{ margin: '0 auto', width: '100%' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <Dumbbell className="animate-spin" size={28} style={{ color: '#8b5cf6' }} />
                </div>
                
                <h3 className="gradient-text" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                  {ingestProgress < 34 
                    ? (ingestSource === 'file' ? "Uploading to Storage Bucket..." : "Downloading Video Sources...") 
                    : ingestProgress < 67 
                      ? "Analyzing Movement Modalities..." 
                      : "Mapping to Canonical Library..."}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '450px' }}>
                  Please keep this window open. Our computer vision models are scanning visual frames and extracting exercise patterns.
                </p>

                {/* Progress Bar Container */}
                <div style={{ width: '100%', maxWidth: '400px', height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden', margin: '0.5rem 0' }}>
                  <div 
                    style={{ 
                      width: `${ingestProgress}%`, 
                      height: '100%', 
                      background: 'var(--accent-gradient)', 
                      borderRadius: '4px',
                      transition: 'width 0.1s linear'
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ec4899' }}>{Math.round(ingestProgress)}% Complete</span>

                {/* Stages List */}
                <div className="loader-stages">
                  <div className={`loader-stage-item ${ingestProgress < 34 ? 'active' : 'completed'}`}>
                    <span>{ingestSource === 'file' ? "1. Uploading to Storage Bucket" : "1. Ingesting & Downsampling Stream"}</span>
                    <span>{ingestProgress >= 34 ? "✓ Done" : "In Progress..."}</span>
                  </div>
                  
                  <div className={`loader-stage-item ${ingestProgress < 34 ? 'pending' : ingestProgress < 67 ? 'active' : 'completed'}`}>
                    <span>2. Running Pose & Object Trackers</span>
                    <span>{ingestProgress < 34 ? "Waiting" : ingestProgress >= 67 ? "✓ Done" : "In Progress..."}</span>
                  </div>

                  <div className={`loader-stage-item ${ingestProgress < 67 ? 'pending' : ingestProgress < 100 ? 'active' : 'completed'}`}>
                    <span>3. Normalizing Naming & Synonyms</span>
                    <span>{ingestProgress < 67 ? "Waiting" : ingestProgress >= 100 ? "✓ Done" : "In Progress..."}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* SPLIT INPUT CARDS */
              <div className="ingest-grid">
                
                {/* Link URL Ingestion */}
                <div className="glass-card ingest-card">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="stat-icon-wrapper" style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', alignSelf: 'flex-start' }}>
                      <Activity size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Social Media Link Ingestion</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      Paste a public link from YouTube, Instagram Reels, or TikTok to parse exercise metadata from audio and visual tracks.
                    </p>
                  </div>

                  <div className="input-group" style={{ width: '100%', marginTop: '1rem' }}>
                    <label htmlFor="ingest-url">Video Source URL</label>
                    <input 
                      type="text" 
                      id="ingest-url" 
                      placeholder="https://www.youtube.com/watch?v=..." 
                      value={ingestUrl}
                      onChange={(e) => setIngestUrl(e.target.value)}
                    />
                  </div>

                  <button 
                    type="button"
                    onClick={() => handleIngest('url')} 
                    className="auth-btn" 
                    style={{ margin: 0, width: '100%' }}
                    disabled={!ingestUrl.trim()}
                  >
                    Analyze Video Link
                  </button>
                </div>

                {/* File Upload Zone */}
                <div className="glass-card ingest-card">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', alignSelf: 'flex-start' }}>
                      <Footprints size={24} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Direct Video File Upload</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      Upload native mobile or desktop recordings. Supports video containers up to 500MB (MP4, MOV format).
                    </p>
                  </div>

                  <div 
                    className={`dropzone ${dragActive ? 'drag-active' : ''}`}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-upload-input')?.click()}
                  >
                    <input 
                      type="file" 
                      id="file-upload-input" 
                      style={{ display: 'none' }} 
                      accept=".mp4,.mov,video/*"
                      onChange={handleFileChange}
                    />
                    
                    <PlusCircle size={36} style={{ color: '#cbd5e1', opacity: 0.6 }} />
                    <p className="dropzone-text">
                      Drag and drop your file here, or <span className="dropzone-highlight">browse files</span>
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>Supports .MP4, .MOV (Max 500MB)</p>
                  </div>

                  {selectedFile && (
                    <div className="file-info">
                      <div className="file-info-text">
                        <span className="file-name">{selectedFile.name}</span>
                        <span className="file-size">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }} 
                        className="remove-file-btn"
                        aria-label="Remove selected file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  <button 
                    type="button"
                    onClick={() => handleIngest('file')} 
                    className="auth-btn" 
                    style={{ margin: 0, width: '100%', background: 'linear-gradient(135deg, #38bdf8, #8b5cf6)' }}
                    disabled={!selectedFile}
                  >
                    Upload & Analyze File
                  </button>

                  <button 
                    type="button"
                    id="dev-mock-upload-btn"
                    onClick={async () => {
                      try {
                        const res = await fetch('/test-video.mp4')
                        if (!res.ok) throw new Error("Failed to load local test-video.mp4")
                        const blob = await res.blob()
                        const mockFile = new File([blob], 'test-video-real.mp4', { type: 'video/mp4' })
                        await handleIngest('file', mockFile)
                      } catch (err: unknown) {
                        const errorMsg = err instanceof Error ? err.message : String(err)
                        setIngestError(`Test initialization failed: ${errorMsg}`)
                      }
                    }} 
                    className="auth-btn" 
                    style={{ margin: '0.5rem 0 0 0', width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    [Test Dev Mode] Mock File Ingestion
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

        {activeTab === 'generator' && (
          <div className="ingestion-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '900px', margin: '0 auto' }}>
            <div className="dashboard-header-left" style={{ marginBottom: '1rem' }}>
              <h2 className="gradient-text" style={{ fontSize: '1.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Brain size={24} style={{ color: '#8b5cf6' }} />
                AI Workout Generator
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
                Design customized, multi-day training splits utilizing only exercises previously saved in your personal database catalog.
              </p>
            </div>

            {/* Success Toast Banner */}
            {successToast && (
              <div className="success-message" style={{ width: '100%', marginBottom: '0.5rem', fontSize: '0.95rem', padding: '1rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>✓</span>
                <span>{successToast}</span>
              </div>
            )}

            {/* Error Alert Banner */}
            {ingestError && (
              <div className="alert-banner" style={{ marginBottom: '0.5rem' }}>
                <div style={{ color: '#ef4444', marginTop: '2px' }}>
                  <X size={18} />
                </div>
                <div className="alert-banner-content">
                  <div className="alert-banner-title">Generation Issue</div>
                  <div className="alert-banner-desc">{ingestError}</div>
                </div>
                <button onClick={() => setIngestError(null)} className="alert-banner-dismiss" aria-label="Dismiss error">
                  <X size={16} />
                </button>
              </div>
            )}

            {generatorLoading ? (
              /* PROGRESSIVE MULTI-STAGE SKELETON LOADER */
              <div className="glass-card loader-card" style={{ padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1rem', width: '100%' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.5rem' }}>
                  <Dumbbell className="animate-spin" size={28} style={{ color: '#8b5cf6' }} />
                </div>
                <h3 className="gradient-text" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                  {generatorProgress}
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '450px' }}>
                  Please wait. Our model is referencing your workout history and constructing a structured routine split.
                </p>
              </div>
            ) : generatedProgram ? (
              /* GENERATED ROUTINE PREVIEW BLOCKS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Generated Split Program
                      </span>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', marginTop: '0.2rem' }}>
                        {generatedProgram.program_name}
                      </h3>
                    </div>
                    <button 
                      onClick={() => setGeneratedProgram(null)}
                      className="quick-action-btn"
                      style={{ margin: 0, padding: '0.4rem 1rem', background: 'rgba(255, 255, 255, 0.05)', fontSize: '0.8rem' }}
                    >
                      Generate New
                    </button>
                  </div>

                  {/* Day Blocks Grid */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {generatedProgram.days.map((day, idx) => (
                      <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '14px', padding: '1.5rem' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38bdf8', marginBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.03)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Calendar size={16} />
                          {day.day_name}
                        </h4>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {day.routine.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 0, 0, 0.2)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.02)' }}>
                              <div>
                                <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {item.exercise_name}
                                  {item.canonical_id ? (
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                      ✓ Canonical
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                      Custom
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                                <span><strong>{item.sets}</strong> sets</span>
                                <span>•</span>
                                <span><strong>{item.reps_range}</strong> reps</span>
                                <span>•</span>
                                <span><strong>{item.rest_seconds}s</strong> rest</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Confirm Save Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                  <button 
                    type="button" 
                    onClick={() => setGeneratedProgram(null)} 
                    className="cancel-btn"
                    style={{ maxWidth: '200px' }}
                    disabled={savingProgram}
                  >
                    Discard Program
                  </button>
                  <button 
                    type="button" 
                    onClick={handleSaveProgram} 
                    className="submit-btn"
                    style={{ maxWidth: '280px', margin: 0 }}
                    disabled={savingProgram}
                  >
                    {savingProgram && (
                      <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #ffffff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s infinite linear', marginRight: '8px', verticalAlign: 'middle' }} />
                    )}
                    Save Program to Schedule
                  </button>
                </div>
              </div>
            ) : (
              /* PROMPT INPUT VIEW */
              <form onSubmit={handleGenerateProgram} className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label htmlFor="generator-prompt" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                    Describe Your Training Goal
                  </label>
                  <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>
                    Our model will structure set ranges, split days, and rest periods matching ONLY the exercises in your catalog.
                  </p>
                </div>

                <div className="input-group">
                  <textarea
                    id="generator-prompt"
                    value={generatorPrompt}
                    onChange={(e) => setGeneratorPrompt(e.target.value)}
                    placeholder="e.g., Build an intense 3-day hypertrophy split using only my saved bicep, chest and back exercises..."
                    rows={4}
                    required
                    style={{ minHeight: '120px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    type="submit" 
                    className="submit-btn"
                    style={{ maxWidth: '260px', margin: 0 }}
                    disabled={!generatorPrompt.trim()}
                  >
                    <Sparkles size={16} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
                    Generate Program Split
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>

      {/* "+ Log Workout" Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="glass-card modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title gradient-text">Log a Workout</h2>
              <button onClick={() => setIsModalOpen(false)} className="modal-close-btn" aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLogWorkout} className="modal-form">
              
              <div className="input-group">
                <label htmlFor="activity-type">Activity Type</label>
                <div className="select-wrapper">
                  <select 
                    id="activity-type" 
                    value={newActivity} 
                    onChange={(e) => {
                      setNewActivity(e.target.value)
                      // Default calorie estimates based on activity and default 30 min duration
                      if (e.target.value === 'running') setNewCalories('300')
                      else if (e.target.value === 'strength') setNewCalories('150')
                      else if (e.target.value === 'cycling') setNewCalories('220')
                      else if (e.target.value === 'yoga') setNewCalories('100')
                      else if (e.target.value === 'walking') setNewCalories('120')
                      else setNewCalories('200')
                    }}
                  >
                    <option value="running">🏃‍♂️ Running</option>
                    <option value="strength">🏋️‍♀️ Strength Training</option>
                    <option value="cycling">🚴‍♂️ Cycling</option>
                    <option value="yoga">🧘‍♂️ Yoga & Flexibility</option>
                    <option value="walking">🚶‍♂️ Walking</option>
                    <option value="other">💪 Other Workout</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label htmlFor="duration">Duration (mins)</label>
                  <input 
                    type="number" 
                    id="duration" 
                    min="1" 
                    max="480"
                    required
                    value={newDuration}
                    onChange={(e) => {
                      setNewDuration(e.target.value)
                      // Scale calorie burn with duration estimate
                      const min = parseInt(e.target.value) || 0
                      let rate = 7
                      if (newActivity === 'running') rate = 10
                      else if (newActivity === 'strength') rate = 5
                      else if (newActivity === 'cycling') rate = 7.5
                      else if (newActivity === 'yoga') rate = 3.5
                      else if (newActivity === 'walking') rate = 4
                      setNewCalories(Math.round(min * rate).toString())
                    }}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="calories">Calories (kcal)</label>
                  <input 
                    type="number" 
                    id="calories" 
                    min="1" 
                    max="5000"
                    required
                    value={newCalories}
                    onChange={(e) => setNewCalories(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="notes">Notes / Achievements</label>
                <textarea 
                  id="notes" 
                  rows={2} 
                  placeholder="E.g., Felt great! New personal pace."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>

              <div className="modal-form-actions">
                <button type="button" onClick={() => setIsModalOpen(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" disabled={submittingWorkout} className="submit-btn">
                  {submittingWorkout ? (
                    <Loader2 className="animate-spin" size={16} style={{ display: 'inline', marginRight: '6px' }} />
                  ) : null}
                  Save Workout
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Profile Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="glass-card modal-content" style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title gradient-text">Profile Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="modal-close-btn" aria-label="Close modal">
                <X size={20} />
              </button>
            </div>

            {settingsLoading && !editDob ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0' }}>
                <Loader2 className="animate-spin" size={32} style={{ color: '#8b5cf6', marginBottom: '1rem' }} />
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading user settings...</p>
              </div>
            ) : (
              <form onSubmit={handleSaveSettings} className="modal-form">
                
                {/* Section 1: Goal Focus */}
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ec4899', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Goal & Activity</h3>
                  <div className="form-row">
                    <div className="input-group">
                      <label htmlFor="edit-goal">Primary Goal</label>
                      <select id="edit-goal" value={editGoal} onChange={(e) => setEditGoal(e.target.value)}>
                        <option value="lose_weight">🎯 Lose Weight</option>
                        <option value="build_muscle">💪 Build Muscle</option>
                        <option value="endurance">🏃‍♂️ Endurance</option>
                        <option value="fitness">🌟 General Health</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label htmlFor="edit-activity">Activity Level</label>
                      <select id="edit-activity" value={editActivity} onChange={(e) => setEditActivity(e.target.value)}>
                        <option value="sedentary">🪑 Sedentary</option>
                        <option value="light">🚶‍♂️ Lightly Active</option>
                        <option value="moderate">🚴‍♂️ Moderately Active</option>
                        <option value="active">🔥 Highly Active</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Physical Metrics */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Physical Profile</h3>
                  
                  {/* Units Toggle */}
                  <div className="input-group" style={{ marginBottom: '1rem' }}>
                    <label>Measurement Unit</label>
                    <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.25rem', marginTop: '0.25rem' }}>
                      <button 
                        type="button"
                        onClick={() => setEditUnits('metric')}
                        style={{
                          flex: 1,
                          background: editUnits === 'metric' ? 'var(--accent-gradient)' : 'none',
                          border: 'none',
                          color: '#ffffff',
                          padding: '0.5rem',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Metric (kg, cm)
                      </button>
                      <button 
                        type="button"
                        onClick={() => setEditUnits('imperial')}
                        style={{
                          flex: 1,
                          background: editUnits === 'imperial' ? 'var(--accent-gradient)' : 'none',
                          border: 'none',
                          color: '#ffffff',
                          padding: '0.5rem',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        Imperial (lbs, ft)
                      </button>
                    </div>
                  </div>

                  <div className="form-row" style={{ marginBottom: '1rem' }}>
                    <div className="input-group">
                      <label htmlFor="edit-gender">Biological Sex</label>
                      <select id="edit-gender" value={editGender} onChange={(e) => setEditGender(e.target.value)}>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Prefer not to say</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label htmlFor="edit-dob">Date of Birth</label>
                      <input type="date" id="edit-dob" required value={editDob} onChange={(e) => setEditDob(e.target.value)} />
                    </div>
                  </div>

                  <div className="form-row">
                    {editUnits === 'metric' ? (
                      <>
                        <div className="input-group">
                          <label htmlFor="edit-weight">Weight (kg)</label>
                          <input 
                            type="number" 
                            id="edit-weight" 
                            min="30" 
                            max="300"
                            value={editWeightKg}
                            onChange={(e) => setEditWeightKg(e.target.value)}
                            required
                          />
                        </div>
                        <div className="input-group">
                          <label htmlFor="edit-height">Height (cm)</label>
                          <input 
                            type="number" 
                            id="edit-height" 
                            min="100" 
                            max="250"
                            value={editHeightCm}
                            onChange={(e) => setEditHeightCm(e.target.value)}
                            required
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="input-group">
                          <label htmlFor="edit-weight-lbs">Weight (lbs)</label>
                          <input 
                            type="number" 
                            id="edit-weight-lbs" 
                            min="60" 
                            max="660"
                            value={editWeightLbs}
                            onChange={(e) => setEditWeightLbs(e.target.value)}
                            required
                          />
                        </div>
                        <div className="input-group">
                          <label>Height (ft/in)</label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <select value={editHeightFt} onChange={(e) => setEditHeightFt(e.target.value)}>
                              {[3,4,5,6,7,8].map(ft => <option key={ft} value={ft}>{ft} ft</option>)}
                            </select>
                            <select value={editHeightIn} onChange={(e) => setEditHeightIn(e.target.value)}>
                              {[0,1,2,3,4,5,6,7,8,9,10,11].map(inch => <option key={inch} value={inch}>{inch} in</option>)}
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Section 3: Target Goals */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Daily Targets</h3>
                    <button 
                      type="button" 
                      onClick={handleRecalculateSuggestions}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ec4899',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: 0
                      }}
                    >
                      Reset to Recommended Goals
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Steps */}
                    <div className="input-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label>Steps Goal</label>
                        <span style={{ fontWeight: 800, color: '#38bdf8' }}>{editSteps.toLocaleString()}</span>
                      </div>
                      <input 
                        type="range" 
                        min="3000" 
                        max="25000" 
                        step="500" 
                        value={editSteps} 
                        onChange={(e) => setEditSteps(parseInt(e.target.value))} 
                        style={{ accentColor: '#38bdf8' }}
                      />
                    </div>

                    {/* Calories */}
                    <div className="input-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label>Active Calories Goal</label>
                        <span style={{ fontWeight: 800, color: '#f43f5e' }}>{editCalories} kcal</span>
                      </div>
                      <input 
                        type="range" 
                        min="150" 
                        max="2000" 
                        step="25" 
                        value={editCalories} 
                        onChange={(e) => setEditCalories(parseInt(e.target.value))} 
                        style={{ accentColor: '#f43f5e' }}
                      />
                    </div>

                    {/* Active Minutes */}
                    <div className="input-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label>Active Minutes Goal</label>
                        <span style={{ fontWeight: 800, color: '#a855f7' }}>{editMinutes} mins</span>
                      </div>
                      <input 
                        type="range" 
                        min="15" 
                        max="180" 
                        step="5" 
                        value={editMinutes} 
                        onChange={(e) => setEditMinutes(parseInt(e.target.value))} 
                        style={{ accentColor: '#a855f7' }}
                      />
                    </div>

                    {/* Water */}
                    <div className="input-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <label>Water Goal</label>
                        <span style={{ fontWeight: 800, color: '#22c55e' }}>{editWater} cups</span>
                      </div>
                      <input 
                        type="range" 
                        min="4" 
                        max="16" 
                        step="1" 
                        value={editWater} 
                        onChange={(e) => setEditWater(parseInt(e.target.value))} 
                        style={{ accentColor: '#22c55e' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="modal-form-actions" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setIsSettingsOpen(false)} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" disabled={settingsLoading} className="submit-btn">
                    {settingsLoading ? (
                      <Loader2 className="animate-spin" size={16} style={{ display: 'inline', marginRight: '6px' }} />
                    ) : null}
                    Save Settings
                  </button>
                </div>

              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
