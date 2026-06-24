'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import * as Sentry from '@sentry/nextjs'
import { loginAction, signupAction, verifyConnectionAction } from './actions'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')
  const messageParam = searchParams.get('message')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState(errorParam || '')
  const [message, setMessage] = useState(messageParam || '')
  const [loading, setLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'failed'>('checking')
  const [connectionError, setConnectionError] = useState<string>('')

  const supabase = createClient()

  useEffect(() => {
    async function verifyConnection() {
      const result = await verifyConnectionAction()
      if (result.success) {
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('failed')
        setConnectionError(result.error || 'Unknown error')
        Sentry.captureException(new Error(`Supabase connection check failed: ${result.error}`))
      }
    }
    verifyConnection()
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    Sentry.addBreadcrumb({
      category: 'auth',
      message: `Attempting ${isSignUp ? 'signup' : 'login'} for email`,
      level: 'info',
      data: { email }
    })

    try {
      if (isSignUp) {
        const result = await signupAction(email, password, name, window.location.origin)
        if (result.error) throw new Error(result.error)
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Signup flow completed successfully, verification email sent',
          level: 'info'
        })
        setMessage('Registration successful! Please check your email to confirm your account.')
      } else {
        const result = await loginAction(email, password)
        if (result.error) throw new Error(result.error)
        
        Sentry.addBreadcrumb({
          category: 'auth',
          message: 'Login successful, fetching session and setting user context',
          level: 'info'
        })

        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          Sentry.setUser({
            id: session.user.id,
            email: session.user.email,
            username: session.user.user_metadata?.full_name
          })
        }

        router.push('/')
        router.refresh()
      }
    } catch (err: any) {
      Sentry.captureException(err)
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="glass-card auth-container">
        <div className="auth-header">
          <h1>
            <span className="gradient-text">
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </span>
          </h1>
          <p className="auth-subtitle">
            {isSignUp ? 'Get started with your email' : 'Sign in to continue to Dashboard'}
          </p>
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: connectionStatus === 'connected' ? '#10b981' : connectionStatus === 'failed' ? '#ef4444' : '#f59e0b',
              boxShadow: connectionStatus === 'connected' ? '0 0 8px #10b981' : connectionStatus === 'failed' ? '0 0 8px #ef4444' : '0 0 8px #f59e0b',
              display: 'inline-block'
            }} />
            <span style={{ color: connectionStatus === 'connected' ? '#a7f3d0' : connectionStatus === 'failed' ? '#fca5a5' : '#fde68a' }}>
              {connectionStatus === 'connected' 
                ? 'Connected to Supabase' 
                : connectionStatus === 'failed' 
                  ? `Supabase connection failed (${connectionError})` 
                  : 'Checking Supabase connection...'}
            </span>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <form onSubmit={handleAuth} className="auth-form">
          {isSignUp && (
            <div className="input-group">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="auth-toggle">
          <span>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button
            type="button"
            onClick={() => {
              const nextMode = !isSignUp
              setIsSignUp(nextMode)
              setError('')
              setMessage('')
              Sentry.addBreadcrumb({
                category: 'auth',
                message: `Switched form mode to ${nextMode ? 'signup' : 'signin'}`,
                level: 'info'
              })
            }}
            className="toggle-btn"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  )
}
