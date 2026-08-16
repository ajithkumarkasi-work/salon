import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { LoginSchema, LoginDto } from '@glowbook/validation';
import { useLogin } from '@/features/auth/hooks';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useToast } from '@/shared/hooks/use-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginDto>({ resolver: zodResolver(LoginSchema) });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await login.mutateAsync(data);
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error?.response?.data?.message ?? 'Invalid email or password',
      });
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
        <p className="text-sm text-muted-foreground mt-1">Enter your credentials to access your dashboard</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <Input
            id="email"
            type="email"
            placeholder="owner@glowbook.demo"
            autoComplete="email"
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
          {errors.password && (
            <p id="password-error" className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>

      {/* Demo credentials */}
      <div className="rounded-lg bg-muted p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Demo accounts</p>
        {[
          { role: 'Customer', email: 'customer@glowbook.demo' },
          { role: 'Customer 2', email: 'customer2@glowbook.demo' },
          { role: 'Owner', email: 'owner@glowbook.demo' },
          { role: 'Staff', email: 'staff@glowbook.demo' },
          { role: 'Admin', email: 'admin@glowbook.demo' },
        ].map((acc) => (
          <div key={acc.role} className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{acc.role}:</span> {acc.email} / GlowBook2024
          </div>
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link to="/register" className="text-primary font-medium hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
