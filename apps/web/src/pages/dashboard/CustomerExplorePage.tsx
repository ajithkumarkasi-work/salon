import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { api } from '@/shared/lib/api';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

function renderStars(ratingValue: number) {
  const rounded = Math.max(0, Math.min(5, Math.round(ratingValue)));
  return Array.from({ length: 5 }, (_, index) => {
    const filled = index < rounded;
    return (
      <Star
        key={`star-${index}`}
        className={`h-3.5 w-3.5 ${filled ? 'fill-amber-500 text-amber-500' : 'text-amber-300'}`}
      />
    );
  });
}

export default function CustomerExplorePage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customer-explore', search],
    queryFn: async () => {
      const { data } = await api.get('/salons', { params: { search: search || undefined, limit: 24 } });
      return data?.data ?? [];
    },
  });

  const salons = useMemo(() => data ?? [], [data]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold sm:text-2xl">Explore</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search salons by name, city, or service keywords.</p>
      </div>

      <div className="rounded-lg border bg-card p-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search salons or services..."
          className="border-0 shadow-none focus-visible:ring-0"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading salons...</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {salons.map((salon: any) => (
            <Card
              key={salon.id}
              className="overflow-hidden border-border/70 transition-all hover:border-primary/40 hover:shadow-sm active:scale-[0.99]"
            >
              <Link to={`/dashboard/salons/${salon.id}`} className="block h-full p-0">
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-2 break-words text-base">{salon.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{salon.city}</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-amber-800">
                      {renderStars(Number(salon.rating ?? 0))}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{Number(salon.rating ?? 0).toFixed(1)}/5</span>
                  </div>
                  <span className="inline-flex min-h-9 w-full items-center justify-center rounded-md bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                    View details
                  </span>
                </CardContent>
              </Link>
            </Card>
          ))}
          {!salons.length && <p className="text-sm text-muted-foreground">No salons found.</p>}
        </div>
      )}
    </div>
  );
}
