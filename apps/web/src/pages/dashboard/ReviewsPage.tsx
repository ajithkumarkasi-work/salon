import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api';
import { useSalonStore } from '@/shared/stores/salon.store';
import { useAuthStore } from '@/shared/stores/auth.store';
import { useStaff } from '@/features/staff/hooks';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { getInitials, formatRelativeTime } from '@/shared/lib/utils';
import { Star, MessageSquareText } from 'lucide-react';
import { UserRole } from '@glowbook/shared-types';

export default function ReviewsPage() {
  const { activeSalonId } = useSalonStore();
  const { user } = useAuthStore();
  const { data: staff } = useStaff(activeSalonId ?? '');

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', activeSalonId],
    queryFn: async () => {
      const { data } = await api.get(`/salons/${activeSalonId}/reviews`);
      return data;
    },
    enabled: !!activeSalonId,
  });

  const myStaffProfile = useMemo(
    () => (staff ?? []).find((member: any) => member.user?.id === user?.id),
    [staff, user?.id],
  );

  const visibleReviews = useMemo(() => {
    const allReviews = data?.data ?? [];
    if (user?.role === UserRole.STAFF) {
      return allReviews.filter((review: any) => {
        const reviewStaffId = review.staff?.id ?? review.staffId;
        return reviewStaffId && myStaffProfile?.id && reviewStaffId === myStaffProfile.id;
      });
    }
    return allReviews;
  }, [data?.data, myStaffProfile?.id, user?.role]);

  const averageRating = useMemo(() => {
    if (!visibleReviews.length) return 0;
    const total = visibleReviews.reduce((sum: number, review: any) => sum + Number(review.rating ?? 0), 0);
    return total / visibleReviews.length;
  }, [visibleReviews]);

  const withCommentCount = useMemo(
    () => visibleReviews.filter((review: any) => review.comment && String(review.comment).trim()).length,
    [visibleReviews],
  );

  return (
    <div className="space-y-4 max-[375px]:space-y-3 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl max-[375px]:text-xl font-bold">Reviews</h1>
          {user?.role === UserRole.STAFF && (
            <p className="text-xs text-muted-foreground mt-1 max-[375px]:text-[11px]">Showing only reviews for your completed work.</p>
          )}
          {!!visibleReviews.length && (
            <div className="flex flex-wrap items-center gap-2 max-[375px]:gap-1.5 mt-1">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 max-[375px]:h-3 max-[375px]:w-3 ${star <= Math.round(averageRating) ? 'text-amber-400 fill-current' : 'text-gray-200'}`}
                  />
                ))}
              </div>
              <span className="text-sm max-[375px]:text-xs font-semibold">{averageRating.toFixed(1)}</span>
              <span className="text-sm max-[375px]:text-xs text-muted-foreground">({visibleReviews.length} reviews)</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-[375px]:gap-2">
        <Card>
          <CardContent className="p-4 max-[375px]:p-3">
            <p className="text-xs text-muted-foreground">Visible reviews</p>
            <p className="text-xl max-[375px]:text-lg font-semibold mt-1">{visibleReviews.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 max-[375px]:p-3">
            <p className="text-xs text-muted-foreground">Average rating</p>
            <p className="text-xl max-[375px]:text-lg font-semibold mt-1">{averageRating.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 max-[375px]:p-3">
            <p className="text-xs text-muted-foreground">With customer message</p>
            <p className="text-xl max-[375px]:text-lg font-semibold mt-1">{withCommentCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {isLoading
          ? Array(5).fill(0).map((_, i) => (
              <div key={i} className="rounded-xl border p-4 space-y-2">
                <div className="flex gap-3">
                  <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
                    <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))
          : !visibleReviews.length
          ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="font-medium">No reviews found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Customer ratings and messages will appear here after completed appointments are reviewed.
                  </p>
                </CardContent>
              </Card>
            )
          : visibleReviews.map((review: any) => (
              <Card key={review.id}>
                <CardContent className="p-4 max-[375px]:p-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs">
                        {getInitials(review.customer?.firstName ?? '', review.customer?.lastName ?? '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between mb-1">
                        <div className="min-w-0">
                          <span className="font-medium text-sm max-[375px]:text-xs">
                            {review.customer?.firstName} {review.customer?.lastName}
                          </span>
                          <span className="text-xs max-[375px]:text-[11px] text-muted-foreground ml-2 inline-block">
                            {formatRelativeTime(review.createdAt)}
                          </span>
                        </div>
                        <div className="flex shrink-0">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 max-[375px]:h-3 max-[375px]:w-3 ${star <= review.rating ? 'text-amber-400 fill-current' : 'text-gray-200'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {review.service?.name && <Badge variant="secondary" className="text-xs">{review.service.name}</Badge>}
                        {review.staff && (
                          <p className="text-xs text-muted-foreground">
                            Served by {review.staff?.user?.firstName} {review.staff?.user?.lastName}
                          </p>
                        )}
                      </div>
                      {review.comment ? (
                        <div className="rounded-md border bg-muted/30 p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                            <MessageSquareText className="h-3.5 w-3.5" />
                            Customer message
                          </p>
                          <p className="text-sm max-[375px]:text-xs text-foreground break-words">{review.comment}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No written message.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>
    </div>
  );
}
