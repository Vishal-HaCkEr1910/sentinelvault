import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, ShieldCheck, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { login } from '@/api/auth'
import { DEMO_USERS, DEMO_PASSWORD } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RoleBadge } from '@/components/shared/RoleBadge'

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { token, login: storeLogin } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [showDemoCredentials, setShowDemoCredentials] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  // Already logged in
  if (token) return <Navigate to="/dashboard" replace />

  const onSubmit = async (data: LoginForm) => {
    try {
      const res = await login(data.username, data.password)
      storeLogin(res.access_token, res.role, res.full_name, data.username)
      toast.success(`Welcome, ${res.full_name}`)
      navigate('/dashboard')
    } catch {
      toast.error('Login failed. Check your credentials and try again.')
    }
  }

  const fillCredentials = (username: string) => {
    setValue('username', username)
    setValue('password', DEMO_PASSWORD)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <ShieldCheck className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Sentinel Vault</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Secure Digital Evidence Management
            </p>
          </div>
        </div>

        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>Enter your credentials to access the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your username"
                  autoComplete="username"
                  {...register('username')}
                />
                {errors.username && (
                  <p className="text-xs text-destructive">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="pr-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo Credentials */}
        <Card className="shadow-sm">
          <button
            type="button"
            className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowDemoCredentials(!showDemoCredentials)}
          >
            <span>Demo Credentials</span>
            {showDemoCredentials ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showDemoCredentials && (
            <div className="border-t px-5 pb-4">
              <p className="text-xs text-muted-foreground mt-3 mb-3">
                All accounts use password:{' '}
                <code className="font-mono font-semibold text-foreground">{DEMO_PASSWORD}</code>.
                Click a row to fill the form.
              </p>
              <div className="space-y-1.5">
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.username}
                    type="button"
                    onClick={() => fillCredentials(u.username)}
                    className="w-full flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                  >
                    <span className="font-mono text-xs">{u.username}</span>
                    <RoleBadge role={u.role} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
