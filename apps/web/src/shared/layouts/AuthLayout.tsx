import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200')] bg-cover bg-center opacity-20" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">GlowBook</h1>
            <p className="mt-2 text-primary-foreground/80 text-lg">Salon & Spa Management Platform</p>
          </div>
          <div className="space-y-6">
            {[
              { icon: '📅', title: 'Smart Scheduling', desc: 'Real-time availability with intelligent conflict prevention' },
              { icon: '💳', title: 'Integrated Payments', desc: 'Stripe-powered payments with automatic refund handling' },
              { icon: '📊', title: 'Business Analytics', desc: 'Revenue, bookings, and customer insights at a glance' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-primary-foreground/70">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-primary-foreground/50">
            © 2024 GlowBook. Built for modern salons & spas.
          </p>
        </div>
      </div>

      {/* Auth form panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-bold text-primary">GlowBook</h1>
            <p className="text-muted-foreground">Salon & Spa Management Platform</p>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
