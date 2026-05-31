import { InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm mb-1.5 text-foreground">
            {label}
          </label>
        )}
        <input
          type={type}
          ref={ref}
          className={clsx(
            'w-full h-10 px-3 rounded-lg border border-border bg-input-background',
            'focus:outline-none focus:ring-2 focus:ring-ring',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-destructive',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
