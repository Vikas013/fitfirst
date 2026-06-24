'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import * as Sentry from '@sentry/nextjs'
import { 
  Flame, 
  Footprints, 
  Activity, 
  Droplet, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Sparkles, 
  Ruler, 
  Scale, 
  Calendar, 
  Loader2 
} from 'lucide-react'

interface OnboardingProps {
  name: string
  userId: string
  email: string
}

export default function OnboardingClient({ name, userId, email }: OnboardingProps) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    Sentry.setUser({
      id: userId,
      email: email,
      username: name
    })
  }, [userId, email, name])

  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1: Goals and Activity
  const [primaryGoal, setPrimaryGoal] = useState('fitness')
  const [activityLevel, setActivityLevel] = useState('moderate')

  // Step 2: Biological Metrics
  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric')
  const [gender, setGender] = useState('female')
  const [dob, setDob] = useState('1995-01-01')
  
  // Height & Weight states
  const [weightKg, setWeightKg] = useState('70')
  const [heightCm, setHeightCm] = useState('175')
  
  const [weightLbs, setWeightLbs] = useState('154')
  const [heightFt, setHeightFt] = useState('5')
  const [heightIn, setHeightIn] = useState('9')

  // Step 3: Customized Targets
  const [stepsGoal, setStepsGoal] = useState(10000)
  const [caloriesGoal, setCaloriesGoal] = useState(600)
  const [minutesGoal, setMinutesGoal] = useState(60)
  const [waterGoal, setWaterGoal] = useState(8)

  // Auto-calculate targets when Step 1 or Step 2 changes
  useEffect(() => {
    // Determine weight in kg for calculations
    const w = unitSystem === 'metric' ? parseFloat(weightKg) || 70 : (parseFloat(weightLbs) || 154) * 0.45359237
    
    // Steps Goal Recommendation
    let recSteps = 10000
    if (activityLevel === 'sedentary') recSteps = 6000
    else if (activityLevel === 'light') recSteps = 8000
    else if (activityLevel === 'moderate') recSteps = 10000
    else if (activityLevel === 'active') recSteps = 12000

    // Calorie Goal Recommendation (Active Burn Goal)
    let recCalories = 500
    if (primaryGoal === 'lose_weight') recCalories = Math.round(w * 8)
    else if (primaryGoal === 'build_muscle') recCalories = Math.round(w * 6)
    else if (primaryGoal === 'endurance') recCalories = Math.round(w * 10)
    else recCalories = Math.round(w * 7)
    
    // Clamp calories between 250 and 1500 kcal
    recCalories = Math.max(250, Math.min(1500, recCalories))

    // Active Minutes Recommendation
    let recMinutes = 60
    if (activityLevel === 'sedentary') recMinutes = 30
    else if (activityLevel === 'light') recMinutes = 45
    else if (activityLevel === 'moderate') recMinutes = 60
    else if (activityLevel === 'active') recMinutes = 90

    // Water Goal Recommendation
    let recWater = 8
    if (w > 80) recWater += 1
    if (w > 100) recWater += 1
    if (activityLevel === 'active') recWater += 1

    setStepsGoal(recSteps)
    setCaloriesGoal(recCalories)
    setMinutesGoal(recMinutes)
    setWaterGoal(recWater)
  }, [primaryGoal, activityLevel, unitSystem, weightKg, weightLbs, heightCm, heightFt, heightIn])

  // Conversion Helpers
  const getWeightInKg = () => {
    return unitSystem === 'metric' 
      ? parseFloat(weightKg) || 70 
      : Math.round((parseFloat(weightLbs) || 154) * 0.45359237 * 10) / 10
  }

  const getHeightInCm = () => {
    if (unitSystem === 'metric') {
      return parseFloat(heightCm) || 175
    } else {
      const feet = parseFloat(heightFt) || 5
      const inches = parseFloat(heightIn) || 9
      const totalInches = feet * 12 + inches
      return Math.round(totalInches * 2.54 * 10) / 10
    }
  }

  const calculateBMI = () => {
    const w = getWeightInKg()
    const h = getHeightInCm() / 100
    if (h === 0) return 0
    return Math.round((w / (h * h)) * 10) / 10
  }

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', class: 'badge-other' }
    if (bmi < 25) return { label: 'Normal weight', class: 'badge-cycling' }
    if (bmi < 30) return { label: 'Overweight', class: 'badge-walking' }
    return { label: 'Obese', class: 'badge-running' }
  }

  // Handle Form Submission
  const handleSubmitProfile = async () => {
    setSubmitting(true)
    const finalWeight = getWeightInKg()
    const finalHeight = getHeightInCm()

    Sentry.addBreadcrumb({
      category: 'onboarding',
      message: 'Submitting onboarding profile data',
      level: 'info',
      data: {
        primaryGoal,
        activityLevel,
        unitSystem,
        gender,
        dob,
        weight: finalWeight,
        height: finalHeight,
        goals: {
          steps: stepsGoal,
          calories: caloriesGoal,
          minutes: minutesGoal,
          water: waterGoal
        }
      }
    })

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          onboarded: true,
          date_of_birth: dob,
          gender: gender,
          unit_system: unitSystem,
          height: finalHeight,
          weight: finalWeight,
          activity_level: activityLevel,
          primary_goal: primaryGoal,
          default_steps_goal: stepsGoal,
          default_calories_goal: caloriesGoal,
          default_minutes_goal: minutesGoal,
          default_water_goal: waterGoal,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      Sentry.addBreadcrumb({
        category: 'onboarding',
        message: 'Onboarding profile saved successfully',
        level: 'info'
      })

      router.push('/')
      router.refresh()
    } catch (err: any) {
      Sentry.captureException(err)
      alert(`Error saving profile: ${err.message}`)
      setSubmitting(false)
    }
  }

  const handleNext = () => {
    Sentry.addBreadcrumb({
      category: 'onboarding',
      message: `Navigated to step ${currentStep + 1}`,
      level: 'info',
      data: {
        fromStep: currentStep,
        toStep: currentStep + 1
      }
    })
    setCurrentStep(prev => prev + 1)
  }

  const handleBack = () => {
    Sentry.addBreadcrumb({
      category: 'onboarding',
      message: `Navigated back to step ${currentStep - 1}`,
      level: 'info',
      data: {
        fromStep: currentStep,
        toStep: currentStep - 1
      }
    })
    setCurrentStep(prev => prev - 1)
  }

  const bmi = calculateBMI()
  const bmiCategory = getBMICategory(bmi)

  return (
    <div className="auth-wrapper" style={{ minHeight: '100vh', padding: '2rem 1.5rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '580px', padding: '3rem 2.5rem' }}>
        
        {/* Step indicator */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Step {currentStep} of 4
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[1, 2, 3, 4].map(step => (
              <div 
                key={step} 
                style={{ 
                  width: '24px', 
                  height: '4px', 
                  borderRadius: '2px', 
                  background: step <= currentStep ? 'var(--accent-gradient)' : 'rgba(255, 255, 255, 0.1)',
                  transition: 'background 0.3s ease'
                }} 
              />
            ))}
          </div>
        </div>

        {/* STEP 1: GOALS & ACTIVITY */}
        {currentStep === 1 && (
          <div>
            <h1 className="dashboard-title" style={{ textAlign: 'left', marginBottom: '0.5rem', fontSize: '1.8rem' }}>
              Welcome, <span className="gradient-text">{name}</span>!
            </h1>
            <p className="auth-subtitle" style={{ textAlign: 'left', marginBottom: '2rem' }}>
              Let's customize your profile. What is your main fitness focus?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Primary Goals Grid */}
              <div className="input-group">
                <label>Choose your primary goal</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  
                  <button 
                    type="button"
                    onClick={() => setPrimaryGoal('lose_weight')}
                    style={{
                      background: primaryGoal === 'lose_weight' ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: primaryGoal === 'lose_weight' ? '2px solid #ec4899' : '1px solid var(--glass-border)',
                      borderRadius: '16px',
                      padding: '1.25rem 1rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      color: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>🎯</span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Lose Weight</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setPrimaryGoal('build_muscle')}
                    style={{
                      background: primaryGoal === 'build_muscle' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: primaryGoal === 'build_muscle' ? '2px solid #8b5cf6' : '1px solid var(--glass-border)',
                      borderRadius: '16px',
                      padding: '1.25rem 1rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      color: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>💪</span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Build Muscle</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setPrimaryGoal('endurance')}
                    style={{
                      background: primaryGoal === 'endurance' ? 'rgba(20, 184, 166, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: primaryGoal === 'endurance' ? '2px solid #14b8a6' : '1px solid var(--glass-border)',
                      borderRadius: '16px',
                      padding: '1.25rem 1rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      color: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>🏃‍♂️</span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Endurance</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => setPrimaryGoal('fitness')}
                    style={{
                      background: primaryGoal === 'fitness' ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      border: primaryGoal === 'fitness' ? '2px solid #f43f5e' : '1px solid var(--glass-border)',
                      borderRadius: '16px',
                      padding: '1.25rem 1rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      color: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '1.5rem' }}>🌟</span>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>General Health</span>
                  </button>

                </div>
              </div>

              {/* Activity Level Selector */}
              <div className="input-group">
                <label>Daily Activity Level</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {[
                    { val: 'sedentary', desc: '🪑 Sedentary (office job)', color: '#94a3b8' },
                    { val: 'light', desc: '🚶‍♂️ Light (1-3 days active)', color: '#38bdf8' },
                    { val: 'moderate', desc: '🚴‍♂️ Moderate (3-5 days active)', color: '#a855f7' },
                    { val: 'active', desc: '🔥 Active (6-7 days intense)', color: '#f43f5e' }
                  ].map(lvl => (
                    <button
                      key={lvl.val}
                      type="button"
                      onClick={() => setActivityLevel(lvl.val)}
                      style={{
                        background: activityLevel === lvl.val ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.2)',
                        border: activityLevel === lvl.val ? `1.5px solid ${lvl.color}` : '1px solid var(--glass-border)',
                        borderRadius: '12px',
                        padding: '0.75rem',
                        cursor: 'pointer',
                        color: activityLevel === lvl.val ? '#ffffff' : '#94a3b8',
                        fontWeight: activityLevel === lvl.val ? 700 : 500,
                        textAlign: 'left',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {lvl.desc}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2.5rem' }}>
              <button onClick={handleNext} className="auth-btn" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.75rem' }}>
                Next
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PHYSICAL METRICS */}
        {currentStep === 2 && (
          <div>
            <h1 className="dashboard-title" style={{ textAlign: 'left', marginBottom: '0.5rem', fontSize: '1.8rem' }}>
              About <span className="gradient-text">You</span>
            </h1>
            <p className="auth-subtitle" style={{ textAlign: 'left', marginBottom: '2rem' }}>
              We need a few measurements to construct your customized targets.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Unit System Toggle */}
              <div className="input-group">
                <label>Measurement Unit</label>
                <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '0.25rem', marginTop: '0.5rem' }}>
                  <button 
                    type="button"
                    onClick={() => setUnitSystem('metric')}
                    style={{
                      flex: 1,
                      background: unitSystem === 'metric' ? 'var(--accent-gradient)' : 'none',
                      border: 'none',
                      color: '#ffffff',
                      padding: '0.6rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Metric (kg, cm)
                  </button>
                  <button 
                    type="button"
                    onClick={() => setUnitSystem('imperial')}
                    style={{
                      flex: 1,
                      background: unitSystem === 'imperial' ? 'var(--accent-gradient)' : 'none',
                      border: 'none',
                      color: '#ffffff',
                      padding: '0.6rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Imperial (lbs, ft)
                  </button>
                </div>
              </div>

              {/* Biological Sex and Birthday */}
              <div className="form-row">
                <div className="input-group">
                  <label htmlFor="gender">Biological Sex</label>
                  <select 
                    id="gender" 
                    value={gender} 
                    onChange={(e) => setGender(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.3)', marginTop: '0.5rem', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', borderRadius: '12px', padding: '0.85rem' }}
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Prefer not to say</option>
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="dob">Date of Birth</label>
                  <input 
                    type="date" 
                    id="dob" 
                    required 
                    value={dob} 
                    onChange={(e) => setDob(e.target.value)}
                    style={{ marginTop: '0.5rem' }}
                  />
                </div>
              </div>

              {/* Height and Weight depending on unit system */}
              <div className="form-row">
                {unitSystem === 'metric' ? (
                  <>
                    <div className="input-group">
                      <label htmlFor="weight">Weight (kg)</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="number" 
                          id="weight" 
                          min="30" 
                          max="300"
                          value={weightKg}
                          onChange={(e) => setWeightKg(e.target.value)}
                          required
                          style={{ marginTop: '0.5rem', paddingRight: '2.5rem' }}
                        />
                        <Scale size={16} style={{ position: 'absolute', right: '1rem', top: '1.4rem', color: '#64748b' }} />
                      </div>
                    </div>
                    <div className="input-group">
                      <label htmlFor="height">Height (cm)</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="number" 
                          id="height" 
                          min="100" 
                          max="250"
                          value={heightCm}
                          onChange={(e) => setHeightCm(e.target.value)}
                          required
                          style={{ marginTop: '0.5rem', paddingRight: '2.5rem' }}
                        />
                        <Ruler size={16} style={{ position: 'absolute', right: '1rem', top: '1.4rem', color: '#64748b' }} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="input-group">
                      <label htmlFor="weight-lbs">Weight (lbs)</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="number" 
                          id="weight-lbs" 
                          min="60" 
                          max="660"
                          value={weightLbs}
                          onChange={(e) => setWeightLbs(e.target.value)}
                          required
                          style={{ marginTop: '0.5rem', paddingRight: '2.5rem' }}
                        />
                        <Scale size={16} style={{ position: 'absolute', right: '1rem', top: '1.4rem', color: '#64748b' }} />
                      </div>
                    </div>
                    
                    <div className="input-group">
                      <label>Height (ft/in)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <select 
                          value={heightFt} 
                          onChange={(e) => setHeightFt(e.target.value)}
                          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', borderRadius: '12px', padding: '0.85rem' }}
                        >
                          {[3,4,5,6,7,8].map(ft => <option key={ft} value={ft}>{ft} ft</option>)}
                        </select>
                        <select 
                          value={heightIn} 
                          onChange={(e) => setHeightIn(e.target.value)}
                          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff', borderRadius: '12px', padding: '0.85rem' }}
                        >
                          {[0,1,2,3,4,5,6,7,8,9,10,11].map(inch => <option key={inch} value={inch}>{inch} in</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
              <button type="button" onClick={handleBack} className="cancel-btn" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.5rem' }}>
                <ArrowLeft size={16} />
                Back
              </button>
              <button onClick={handleNext} className="auth-btn" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.75rem' }}>
                Next
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: GOALS TUNING */}
        {currentStep === 3 && (
          <div>
            <h1 className="dashboard-title" style={{ textAlign: 'left', marginBottom: '0.5rem', fontSize: '1.8rem' }}>
              Customize Your <span className="gradient-text">Targets</span>
            </h1>
            <p className="auth-subtitle" style={{ textAlign: 'left', marginBottom: '2rem' }}>
              We calculated some recommendations. Drag the sliders to customize your daily goals.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              
              {/* Steps Slider */}
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Footprints size={16} style={{ color: '#38bdf8' }} />
                    Daily Steps Goal
                  </label>
                  <span style={{ fontWeight: 800, color: '#38bdf8', fontSize: '1.1rem' }}>
                    {stepsGoal.toLocaleString()}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="3000" 
                  max="25000" 
                  step="500"
                  value={stepsGoal}
                  onChange={(e) => setStepsGoal(parseInt(e.target.value))}
                  style={{ marginTop: '0.5rem', accentColor: '#38bdf8' }}
                />
              </div>

              {/* Calories Slider */}
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Flame size={16} style={{ color: '#f43f5e' }} />
                    Daily Active Calories Goal
                  </label>
                  <span style={{ fontWeight: 800, color: '#f43f5e', fontSize: '1.1rem' }}>
                    {caloriesGoal} kcal
                  </span>
                </div>
                <input 
                  type="range" 
                  min="150" 
                  max="2000" 
                  step="25"
                  value={caloriesGoal}
                  onChange={(e) => setCaloriesGoal(parseInt(e.target.value))}
                  style={{ marginTop: '0.5rem', accentColor: '#f43f5e' }}
                />
              </div>

              {/* Active Minutes Slider */}
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Activity size={16} style={{ color: '#a855f7' }} />
                    Daily Active Minutes Goal
                  </label>
                  <span style={{ fontWeight: 800, color: '#a855f7', fontSize: '1.1rem' }}>
                    {minutesGoal} mins
                  </span>
                </div>
                <input 
                  type="range" 
                  min="15" 
                  max="180" 
                  step="5"
                  value={minutesGoal}
                  onChange={(e) => setMinutesGoal(parseInt(e.target.value))}
                  style={{ marginTop: '0.5rem', accentColor: '#a855f7' }}
                />
              </div>

              {/* Water Slider */}
              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Droplet size={16} style={{ color: '#22c55e' }} />
                    Daily Water Goal
                  </label>
                  <span style={{ fontWeight: 800, color: '#22c55e', fontSize: '1.1rem' }}>
                    {waterGoal} cups <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>({~~(waterGoal * 250)} ml)</span>
                  </span>
                </div>
                <input 
                  type="range" 
                  min="4" 
                  max="16" 
                  step="1"
                  value={waterGoal}
                  onChange={(e) => setWaterGoal(parseInt(e.target.value))}
                  style={{ marginTop: '0.5rem', accentColor: '#22c55e' }}
                />
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
              <button type="button" onClick={handleBack} className="cancel-btn" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.5rem' }}>
                <ArrowLeft size={16} />
                Back
              </button>
              <button onClick={handleNext} className="auth-btn" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.75rem' }}>
                Next
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SUMMARY & SUCCESS */}
        {currentStep === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'rgba(139, 92, 246, 0.1)', 
              border: '1px solid rgba(139, 92, 246, 0.2)',
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              margin: '0 auto 1.5rem',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.15)'
            }}>
              <Sparkles size={36} className="animate-float" style={{ color: '#ec4899' }} />
            </div>

            <h1 className="dashboard-title" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
              You're All <span className="gradient-text">Set</span>!
            </h1>
            <p className="auth-subtitle" style={{ marginBottom: '2rem' }}>
              Here is your personal fitness baseline profile.
            </p>

            {/* Profile Summary Card */}
            <div style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--glass-border)', borderRadius: '18px', padding: '1.5rem', marginBottom: '2rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 600 }}>Estimated BMI:</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontSize: '1.1rem', color: '#ffffff' }}>{bmi}</strong>
                  <span className={`workout-badge ${bmiCategory.class}`} style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}>
                    {bmiCategory.label}
                  </span>
                </span>
              </div>

              <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Your Targets Summary</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Footprints size={14} style={{ color: '#38bdf8' }} />
                    <span style={{ fontSize: '0.85rem' }}>{stepsGoal.toLocaleString()} steps</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Flame size={14} style={{ color: '#f43f5e' }} />
                    <span style={{ fontSize: '0.85rem' }}>{caloriesGoal} kcal</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={14} style={{ color: '#a855f7' }} />
                    <span style={{ fontSize: '0.85rem' }}>{minutesGoal} mins active</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Droplet size={14} style={{ color: '#22c55e' }} />
                    <span style={{ fontSize: '0.85rem' }}>{waterGoal} cups water</span>
                  </div>

                </div>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                type="button" 
                onClick={handleBack} 
                disabled={submitting}
                className="cancel-btn" 
                style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.85rem 1.5rem' }}
              >
                <ArrowLeft size={16} />
                Back
              </button>
              
              <button 
                onClick={handleSubmitProfile} 
                disabled={submitting}
                className="submit-btn" 
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Launch Dashboard
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
