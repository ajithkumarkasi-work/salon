import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star } from 'lucide-react';
import { api } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';

function toArray<T = any>(payload: any): T[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

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

export default function CustomerSalonDetailsPage() {
  const { salonId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: salon, isLoading } = useQuery({
    queryKey: ['customer-salon', salonId],
    queryFn: async () => {
      const raw = (await api.get(`/salons/${salonId}`)).data;
      return raw?.data ?? raw;
    },
    enabled: !!salonId,
  });

  const { data: services } = useQuery({
    queryKey: ['customer-salon-services', salonId],
    queryFn: async () => toArray((await api.get(`/salons/${salonId}/services`)).data),
    enabled: !!salonId,
  });

  const { data: staff } = useQuery({
    queryKey: ['customer-salon-staff', salonId],
    queryFn: async () => toArray((await api.get(`/salons/${salonId}/staff`)).data),
    enabled: !!salonId,
  });

  const { data: reviews } = useQuery({
    queryKey: ['customer-salon-reviews', salonId],
    queryFn: async () => toArray((await api.get(`/salons/${salonId}/reviews`, { params: { limit: 5 } })).data),
    enabled: !!salonId,
  });

  const { data: favoriteStatus } = useQuery({
    queryKey: ['customer-salon-favorite-check', salonId],
    queryFn: async () => (await api.get(`/favorites/${salonId}/check`)).data,
    enabled: !!salonId,
  });

  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (favoriteStatus?.isFavorite) {
        await api.delete(`/favorites/${salonId}`);
      } else {
        await api.post(`/favorites/${salonId}`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-salon-favorite-check', salonId] });
      qc.invalidateQueries({ queryKey: ['customer-favorites'] });
    },
  });

  if (isLoading || !salon) {
    return <p className="text-sm text-muted-foreground">Loading salon details...</p>;
  }

  const visibleServices = toArray(services).slice(0, 8);
  const visibleStaff = toArray(staff).slice(0, 8);
  const visibleReviews = toArray(reviews);
  const rating = Number(salon.rating ?? 0);
  const hasServices = visibleServices.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5 animate-fade-in">
      <Button
        type="button"
        variant="ghost"
        className="w-fit px-0 text-muted-foreground hover:text-foreground"
        onClick={() => navigate('/dashboard/explore')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Explore
      </Button>

      <Card className="border-border/70">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold break-words sm:text-2xl">{salon.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{salon.address}, {salon.city}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">
                  {renderStars(rating)}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                  {salon.reviewCount ?? 0} reviews
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                  {visibleServices.length} services listed
                </span>
              </div>
            </div>

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:w-auto md:min-w-[260px]">
              <Button className="w-full" variant="outline" onClick={() => toggleFavorite.mutate()} loading={toggleFavorite.isPending}>
                {favoriteStatus?.isFavorite ? 'In Favorites' : 'Add to Favorites'}
              </Button>
              <Button
                className="w-full"
                type="button"
                onClick={() => navigate(`/dashboard/book/${salon.id}`)}
                disabled={!hasServices}
                title={!hasServices ? 'No services available for booking' : undefined}
              >
                Book Appointment
              </Button>
              {!hasServices && (
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Booking is unavailable because this salon has no services listed yet.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {visibleServices.length ? visibleServices.map((service: any) => (
              <div key={service.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <span className="font-medium">{service.name}</span>
                <span className="text-muted-foreground">₹{Number(service.price).toFixed(0)}</span>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No services available right now.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Staff</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {visibleStaff.length ? visibleStaff.map((member: any) => (
              <div key={member.id} className="rounded-md border px-3 py-2 text-sm">
                {member.user?.firstName} {member.user?.lastName}
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No staff listed yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleReviews.length ? (
              visibleReviews.map((review: any) => (
                <div key={review.id} className="rounded-md border p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {review.customer?.firstName} {review.customer?.lastName}
                    </p>
                    <div className="inline-flex items-center gap-1">
                      {renderStars(Number(review.rating ?? 0))}
                    </div>
                  </div>
                  {review.comment ? <p className="mt-1 text-muted-foreground">{review.comment}</p> : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
