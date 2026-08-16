import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellRing } from 'lucide-react';
import { api } from '@/shared/lib/api';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';

type NotificationFilter = 'all' | 'unread';

export default function CustomerNotificationsPage() {
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['customer-notifications'],
    queryFn: async () => (await api.get('/notifications', { params: { limit: 50 } })).data?.data ?? [],
  });

  const markAllRead = useMutation({
    mutationFn: async () => api.patch('/notifications/mark-all-read'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-notifications'] }),
  });

  const notifications = data ?? [];
  const unreadCount = useMemo(() => notifications.filter((n: any) => !n.isRead).length, [notifications]);
  const visibleNotifications = useMemo(
    () => notifications.filter((n: any) => (filter === 'unread' ? !n.isRead : true)),
    [filter, notifications],
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="rounded-xl border bg-gradient-to-r from-sky-50 to-indigo-50 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground mt-1">Booking reminders and status updates.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Bell className="h-3.5 w-3.5" />
              {notifications.length} total
            </Badge>
            <Badge className="gap-1 bg-blue-100 text-blue-800 hover:bg-blue-100">
              <BellRing className="h-3.5 w-3.5" />
              {unreadCount} unread
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>
            All
          </Button>
          <Button size="sm" variant={filter === 'unread' ? 'default' : 'outline'} onClick={() => setFilter('unread')}>
            Unread
          </Button>
        </div>

        <Button
          variant="outline"
          onClick={() => markAllRead.mutate()}
          loading={markAllRead.isPending}
          disabled={!unreadCount && !markAllRead.isPending}
        >
          Mark all read
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading notifications...</p>
      ) : (
        <div className="space-y-3">
          {visibleNotifications.map((n: any) => (
            <Card key={n.id} className={!n.isRead ? 'border-blue-300 bg-blue-50/40' : 'border-border/70'}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm">{n.title}</p>
                  {!n.isRead ? <Badge className="bg-blue-600 text-white hover:bg-blue-600">New</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                {n.createdAt ? (
                  <p className="mt-2 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
          {!visibleNotifications.length && (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No notifications to show</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {filter === 'unread' ? 'You are all caught up.' : 'No notifications yet.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
