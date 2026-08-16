import { Loader2 } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">GlowBook</span>
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    </div>
  );
}
