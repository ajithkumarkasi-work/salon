import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { RegisterSchema, RegisterDto } from '@glowbook/validation';
import { useRegister } from '@/features/auth/hooks';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useToast } from '@/shared/hooks/use-toast';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const register_ = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterDto>({ resolver: zodResolver(RegisterSchema) });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await register_.mutateAsync(data);
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: error?.response?.data?.message ?? 'Please try again.',
      });
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Create account</h2>
        <p className="text-sm text-muted-foreground mt-1">Set up your salon business on GlowBook</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="firstName" className="text-sm font-medium">First name</label>
            <Input id="firstName" placeholder="Meera" {...register('firstName')} />
            {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lastName" className="text-sm font-medium">Last name</label>
            <Input id="lastName" placeholder="Krishnan" {...register('lastName')} />
            {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <Input id="email" type="email" placeholder="meera@yoursalon.com" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium">Phone (optional)</label>
          <Input id="phone" type="tel" placeholder="+919876543210" {...register('phone')} />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <Input id="password" type="password" placeholder="Min 8 chars, 1 uppercase, 1 number" {...register('password')} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>

        <Button type="submit" className="w-full" loading={register_.isPending}>
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="text-primary font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
