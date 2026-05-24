import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
          {
            'bg-secondary text-secondary-foreground': variant === 'default',
            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400':
              variant === 'success',
            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400':
              variant === 'warning',
            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400':
              variant === 'danger',
            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400':
              variant === 'info',
          },
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Badge.displayName = 'Badge';
