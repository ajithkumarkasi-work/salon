import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { api } from '@/shared/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Star } from 'lucide-react';
import { ContentLoader } from '@/shared/components/PageLoader';

function renderSelectableStars(value: number, onSelect: (rating: number) => void) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onSelect(star)}
            className="rounded-sm p-0.5"
            aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          >
            <Star className={`h-5 w-5 ${active ? 'fill-amber-500 text-amber-500' : 'text-amber-300'}`} />
          </button>
        );
      })}
    </div>
  );
}

function renderStaticStars(value: number) {
  const rounded = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= rounded ? 'fill-amber-500 text-amber-500' : 'text-amber-300'}`}
        />
      ))}
    </div>
  );
}

export default function CustomerReviewsPage() {
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { rating: number; comment: string }>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['customer-reviews-appointments'],
    queryFn: async () => {
      const { data } = await api.get('/appointments', { params: { status: 'COMPLETED', limit: 50 } });
      return data?.data ?? [];
    },
  });

  const submit = useMutation({
    mutationFn: async ({ appointmentId, rating, comment }: { appointmentId: string; rating: number; comment: string }) => {
      await api.post(`/appointments/${appointmentId}/review`, {
        rating,
        comment: comment.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customer-reviews-appointments'] });
    },
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Reviews & Ratings</h1>
        <p className="text-sm text-muted-foreground mt-1">Rate completed appointments and share feedback.</p>
      </div>

      {isLoading ? (
        <ContentLoader label="Loading completed bookings..." />
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((appt: any) => {
            const draft = drafts[appt.id] ?? { rating: 5, comment: '' };
            const reviewed = !!appt.review;
            return (
              <Card key={appt.id} className="border-border/70">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{appt.salon?.name}</CardTitle>
                    <Badge variant={reviewed ? 'secondary' : 'outline'}>{reviewed ? 'Reviewed' : 'Pending review'}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{appt.service?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Appointment: {appt.startTime ? format(new Date(appt.startTime), 'dd MMM yyyy, HH:mm') : '-'}
                  </p>
                  {reviewed ? (
                    <div className="rounded-md bg-muted px-3 py-2 text-sm">
                      {renderStaticStars(Number(appt.review.rating ?? 0))}
                      {appt.review.comment ? <p className="mt-1 text-muted-foreground">{appt.review.comment}</p> : null}
                    </div>
                  ) : (
                    <>
                      <label className="text-sm font-medium">Rating</label>
                      {renderSelectableStars(draft.rating, (rating) => setDrafts((prev) => ({ ...prev, [appt.id]: { ...draft, rating } })))}

                      <label className="text-sm font-medium">Comment (optional)</label>
                      <textarea
                        value={draft.comment}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [appt.id]: { ...draft, comment: e.target.value } }))}
                        placeholder="Share your experience..."
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />

                      <Button
                        onClick={() =>
                          submit.mutate({
                            appointmentId: appt.id,
                            rating: Math.max(1, Math.min(5, Number(draft.rating) || 5)),
                            comment: draft.comment,
                          })
                        }
                        className="w-full sm:w-auto"
                        loading={submit.isPending}
                      >
                        Submit Review
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {!data?.length && <p className="text-sm text-muted-foreground">No completed appointments to review yet.</p>}
        </div>
      )}
    </div>
  );
}
