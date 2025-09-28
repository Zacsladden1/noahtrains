'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useAuth } from '@/hooks/use-auth';
import { Eye, EyeOff, CheckCircle, X } from 'lucide-react';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignInForm = z.infer<typeof signInSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;

export function AuthForm() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3000);
    return () => clearTimeout(t);
  }, [toastMsg]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');

  const signInForm = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signUpForm = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
    },
  });

  const onSignIn = async (data: SignInForm) => {
    setLoading(true);
    setError(null);

    const { error } = await signIn(data.email, data.password);
    
    if (error) {
      setError(error.message);
    }
    
    setLoading(false);
  };

  const onSignUp = async (data: SignUpForm) => {
    setLoading(true);
    setError(null);
    setMessage(null);

    const { data: result, error } = await signUp(data.email, data.password, data.fullName);
    
    if (error) {
      setError(error.message);
    } else if (result.user) {
      setMessage('Account created successfully! Please check your email to verify your account.');
      signUpForm.reset();
      setActiveTab('signin');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm mx-auto">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <img
            src="/no%20backround%20high%20quality%20logo%202.png"
            alt="Noahhtrains"
            className="mx-auto mb-3 h-12 sm:h-14 md:h-16 w-auto drop-shadow-[0_0_20px_rgba(205,167,56,0.25)]"
          />
          <h1 className="text-3xl sm:text-4xl font-[var(--font-heading)] tracking-[0.35em] text-gold mb-2">NOAHHTRAINS</h1>
          <p className="text-white/70 text-sm">Premium Fitness Coaching</p>
        </div>

      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-start gap-2 bg-gold text-black px-4 py-3 rounded-lg shadow-xl border border-black/10 animate-fade-in" role="status" aria-live="polite">
            <CheckCircle className="w-4 h-4 mt-0.5" />
            <div className="text-sm font-medium">{toastMsg}</div>
            <button onClick={()=>setToastMsg(null)} className="ml-2 text-black/70 hover:text-black">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <Card className="bg-black border border-white/10 shadow-2xl relative">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-heading text-white">Welcome Back</CardTitle>
          <CardDescription>
            <span className="text-white/70">Sign in to your account or create a new one</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-6">
          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-900/20 border-red-500/50">
              <AlertDescription className="text-red-200">{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="mb-6 bg-gold/10 border-gold/50">
              <AlertDescription className="text-gold">{message}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/5">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-6">
              <form onSubmit={signInForm.handleSubmit(onSignIn)} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="Enter your email"
                    {...signInForm.register('email')}
                    className="bg-black border-white/20 text-white h-12 text-base focus:border-primary focus:ring-primary"
                  />
                  {signInForm.formState.errors.email && (
                    <p className="text-sm text-red-400 mt-1">
                      {signInForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      {...signInForm.register('password')}
                      className="bg-black border-white/20 text-white h-12 text-base pr-12 focus:border-primary focus:ring-primary"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-12 w-12 hover:bg-white/5"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-white/70" />
                      ) : (
                        <Eye className="h-5 w-5 text-white/70" />
                      )}
                    </Button>
                  </div>
                  {signInForm.formState.errors.password && (
                    <p className="text-sm text-red-400 mt-1">
                      {signInForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gold hover:bg-gold/90 text-black h-12 text-base font-semibold mt-8" 
                  disabled={loading}
                >
                  {loading && <LoadingSpinner size="sm" className="mr-2" />}
                  Sign In
                </Button>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    className="text-xs text-gold hover:underline"
                    onClick={async () => {
                      const email = signInForm.getValues('email');
                      if (!email) { setToastMsg('Enter your email above first'); return; }
                      try {
                        const { error } = await resetPassword(email);
                        if (error) throw error;
                        setToastMsg('If this email exists, a reset link has been sent.');
                      } catch (e:any) {
                        setToastMsg(e?.message || 'Unable to send reset link');
                      }
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-6">
              <form onSubmit={signUpForm.handleSubmit(onSignUp)} className="space-y-5">
                <div className="space-y-3">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Enter your full name"
                    {...signUpForm.register('fullName')}
                    className="bg-black border-white/20 text-white h-12 text-base focus:border-primary focus:ring-primary"
                  />
                  {signUpForm.formState.errors.fullName && (
                    <p className="text-sm text-red-400 mt-1">
                      {signUpForm.formState.errors.fullName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    {...signUpForm.register('email')}
                    className="bg-black border-white/20 text-white h-12 text-base focus:border-primary focus:ring-primary"
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-sm text-red-400 mt-1">
                      {signUpForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Choose a password"
                      {...signUpForm.register('password')}
                      className="bg-black border-white/20 text-white h-12 text-base pr-12 focus:border-primary focus:ring-primary"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-12 w-12 hover:bg-white/5"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-white/70" />
                      ) : (
                        <Eye className="h-5 w-5 text-white/70" />
                      )}
                    </Button>
                  </div>
                  {signUpForm.formState.errors.password && (
                    <p className="text-sm text-red-400 mt-1">
                      {signUpForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    {...signUpForm.register('confirmPassword')}
                    className="bg-black border-white/20 text-white h-12 text-base focus:border-primary focus:ring-primary"
                  />
                  {signUpForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-400 mt-1">
                      {signUpForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gold hover:bg-gold/90 text-black h-12 text-base font-semibold mt-8" 
                  disabled={loading}
                >
                  {loading && <LoadingSpinner size="sm" className="mr-2" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="text-center pb-6">
          <p className="text-xs text-white/50">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </CardFooter>
      </Card>
      </div>
    </div>
  );
}