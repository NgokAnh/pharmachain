import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options?: { value: string; label: string }[];
  children?: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm mb-1.5 text-foreground">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={clsx(
            'w-full h-10 px-3 rounded-lg border border-border bg-input-background',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-destructive',
            className
          )}
          {...props}
        >
          {options
            ? options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))
            : children}
        </select>
        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
