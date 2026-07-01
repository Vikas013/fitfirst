import { Suspense } from 'react'
import LoginForm from './LoginForm'

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="auth-wrapper">
        <div className="glass-card" style={{ textAlign: 'center' }}>
          <p className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
            Loading login portal...
          </p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
