import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Heart, MapPin, Trash2 } from 'lucide-react';
import { api } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';

export default function CustomerFavoritesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['customer-favorites'],
    queryFn: async () => {
      const { data } = await api.get('/favorites');
      return data ?? [];
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (salonId: string) => api.delete(`/favorites/${salonId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-favorites'] }),
  });

  const favorites = data ?? [];

  const getSalonImage = (salon: any) => salon?.images?.[0]?.url || salon?.images?.[0]?.imageUrl || null;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-xl border bg-gradient-to-r from-rose-50 to-orange-50 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Favorites</h1>
            <p className="text-sm text-muted-foreground mt-1">Your saved salons for quick access.</p>
          </div>
          <Badge variant="secondary" className="w-fit">
            {favorites.length} saved
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading favorites...</p>
      ) : (
        <>
          {!!favorites.length && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {favorites.map((fav: any) => {
                const salon = fav.salon;
                const salonId = salon?.id;
                const coverImage = getSalonImage(salon);
                return (
                  <Card key={fav.id} className="overflow-hidden border-border/70 transition-all hover:-translate-y-0.5 hover:shadow-md">
                    <div className="relative aspect-[16/8] bg-gradient-to-br from-rose-100 via-orange-100 to-amber-100">
                      {coverImage ? (
                        <img src={coverImage} alt={salon?.name ?? 'Salon'} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-medium text-slate-600">
                          {salon?.name ?? 'Salon'}
                        </div>
                      )}
                      <div className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 shadow-sm">
                        <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                      </div>
                    </div>

                    <CardHeader className="space-y-2 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">{salon?.name ?? 'Salon'}</CardTitle>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        {typeof salon?.rating !== 'undefined' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                            Rating {Number(salon.rating ?? 0).toFixed(1)}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">
                          <MapPin className="h-3 w-3" />
                          {salon?.city ?? 'City not available'}
                        </span>
                        {salon?.category?.name && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                            {salon.category.name}
                          </span>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          className="w-full"
                          onClick={() => salonId && navigate(`/dashboard/salons/${salonId}`)}
                          disabled={!salonId}
                        >
                          View Details
                        </Button>
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => salonId && navigate(`/dashboard/book/${salonId}`)}
                          disabled={!salonId}
                        >
                          Book
                        </Button>
                      </div>

                      <Button
                        className="w-full border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                        variant="outline"
                        onClick={() => salonId && removeFavorite.mutate(salonId)}
                        disabled={!salonId || removeFavorite.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove from Favorites
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {!favorites.length && (
            <Card>
              <CardContent className="py-12 text-center">
                <Heart className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No favorites yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Save salons from Explore and they will appear here.</p>
                <Button className="mt-4" onClick={() => navigate('/dashboard/explore')}>Go to Explore</Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
