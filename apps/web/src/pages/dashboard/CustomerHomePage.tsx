import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

const actions = [
  { title: 'Explore Salons', desc: 'Find salons and services near you', to: '/dashboard/explore' },
  { title: 'Book & Track', desc: 'Manage upcoming and past appointments', to: '/dashboard/appointments' },
  { title: 'Favorites', desc: 'Your saved salons', to: '/dashboard/favorites' },
  { title: 'Offers', desc: 'Active coupons and discounts', to: '/dashboard/customer-offers' },
  { title: 'Notifications', desc: 'Booking and status alerts', to: '/dashboard/notifications' },
  { title: 'Help & Support', desc: 'FAQ, contact, and policies', to: '/dashboard/help' },
];

export default function CustomerHomePage() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Customer Home</h1>
        <p className="text-sm text-muted-foreground mt-1">Everything you need for booking and managing appointments.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action) => (
          <Link key={action.to} to={action.to}>
            <Card className="h-full hover:bg-accent/40 transition-colors">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{action.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{action.desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
