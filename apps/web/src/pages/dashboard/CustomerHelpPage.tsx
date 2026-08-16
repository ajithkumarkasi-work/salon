import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';

export default function CustomerHelpPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Help & Support</h1>
        <p className="text-sm text-muted-foreground mt-1">FAQs, contact options, and policy summary.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Email: support@glowbook.app</p>
          <p>Phone: +1 800 123 4567</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">FAQs</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">How do I cancel an appointment?</p>
            <p className="text-muted-foreground">Open Appointments, choose a booking, and cancel if it is eligible.</p>
          </div>
          <div>
            <p className="font-medium">How do coupons work?</p>
            <p className="text-muted-foreground">Apply the code while creating a booking. Salon rules may apply.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Policies</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Cancellation policy: cancellations are allowed before the appointment starts.</p>
          <p>Refund policy: refunds follow payment-provider and salon terms.</p>
        </CardContent>
      </Card>
    </div>
  );
}
