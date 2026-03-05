import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Package } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { signUp } from '../../lib/auth'
import { Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export function SignupPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationSent, setVerificationSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await signUp(form.email, form.password, form.fullName)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setVerificationSent(true)
    }
  }

  if (verificationSent) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-secondary/20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>ShopFlow</span>
            </Link>
          </div>
          <div className="shopflow-card p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-lg">Check your email</p>
              <p className="text-sm text-muted-foreground mt-1">
                We sent a verification link to{' '}
                <span className="font-medium text-foreground">{form.email}</span>.
                Click the link to activate your account.
              </p>
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground text-left space-y-1">
              <p className="font-medium text-foreground">Didn't receive it?</p>
              <p>Check your spam or junk folder. Links expire after 24 hours.</p>
            </div>
            <Link to="/login" className="block text-sm text-primary hover:underline font-medium">
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 bg-secondary/20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Package className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>ShopFlow</span>
          </Link>
          <h1 className="text-2xl font-bold">Create account</h1>
          <p className="text-muted-foreground mt-1">Start shopping on ShopFlow</p>
        </div>

        <div className="shopflow-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Priya Sharma"
                value={form.fullName}
                onChange={e => setForm(prev => ({ ...prev, fullName: e.target.value }))}
                required
                autoComplete="name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="priya@example.com"
                value={form.email}
                onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">{error}</div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
