import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export type CustomSelectOption = {
  value: string;
  label: string;
  description?: string;
};

type CustomSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
};

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  disabled = false,
  className,
  buttonClassName,
  menuClassName,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-left text-sm shadow-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary',
          'disabled:cursor-not-allowed disabled:opacity-60',
          open && 'border-primary ring-2 ring-primary/20',
          buttonClassName,
        )}
      >
        <span className={cn('truncate', selectedOption ? 'text-foreground' : 'text-muted-foreground')}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180 text-primary')} />
      </button>

      {open && (
        <div
          className={cn(
            'absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-border bg-white shadow-lg',
            menuClassName,
          )}
        >
          <div className="max-h-64 overflow-y-auto p-1">
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors',
                    selected
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-primary/5',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{option.label}</span>
                    {option.description && (
                      <span className="block truncate text-xs text-muted-foreground">{option.description}</span>
                    )}
                  </span>
                  {selected && <Check className="ml-3 h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}