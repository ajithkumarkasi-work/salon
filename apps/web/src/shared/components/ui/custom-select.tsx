import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export type CustomSelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  indicator?: 'leave';
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
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 0,
  });

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  // Renders the menu into a portal (document.body) and positions it against
  // the trigger's viewport rect, so it always overlays on top instead of
  // getting clipped by an ancestor's overflow-hidden/overflow-x-auto.
  const updateMenuPosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuStyle({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    const handleReposition = () => updateMenuPosition();

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
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

      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuStyle.top, left: menuStyle.left, width: menuStyle.width }}
            className={cn(
              'z-[100] overflow-hidden rounded-md border border-border bg-white shadow-lg',
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
                    disabled={option.disabled}
                    onClick={() => {
                      if (option.disabled) return;
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                      selected
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-primary/5',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 truncate text-sm font-medium">
                        {option.indicator === 'leave' && <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" title="On leave" />}
                        <span className="truncate">{option.label}</span>
                      </span>
                      {option.description && (
                        <span className="block truncate text-xs text-muted-foreground">{option.description}</span>
                      )}
                    </span>
                    {selected && <Check className="ml-3 h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}