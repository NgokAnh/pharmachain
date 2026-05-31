import { HTMLAttributes, forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { Select } from './Select';

interface TableProps extends HTMLAttributes<HTMLTableElement> {}

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative w-full overflow-auto">
        <table
          ref={ref}
          className={clsx('w-full caption-bottom text-sm', className)}
          {...props}
        />
      </div>
    );
  }
);

Table.displayName = 'Table';

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  return (
    <thead
      ref={ref}
      className={clsx('border-b bg-muted/50', className)}
      {...props}
    />
  );
});

TableHeader.displayName = 'TableHeader';

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => {
  return (
    <tbody
      ref={ref}
      className={clsx('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
});

TableBody.displayName = 'TableBody';

export const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => {
  return (
    <tr
      ref={ref}
      className={clsx(
        'border-b transition-colors hover:bg-muted/50',
        className
      )}
      {...props}
    />
  );
});

TableRow.displayName = 'TableRow';

export const TableHead = forwardRef<
  HTMLTableCellElement,
  HTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  return (
    <th
      ref={ref}
      className={clsx(
        'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
        className
      )}
      {...props}
    />
  );
});

TableHead.displayName = 'TableHead';

export const TableCell = forwardRef<
  HTMLTableCellElement,
  HTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  return (
    <td
      ref={ref}
      className={clsx('p-4 align-middle', className)}
      {...props}
    />
  );
});

TableCell.displayName = 'TableCell';

// Pagination Component
interface PaginationProps {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
  sizeOptions?: number[];
}

export function TablePagination({
  page,
  size,
  totalItems,
  totalPages,
  onPageChange,
  onSizeChange,
  sizeOptions = [10, 20, 50, 100],
}: PaginationProps) {
  const startItem = totalItems === 0 ? 0 : (page - 1) * size + 1;
  const endItem = Math.min(page * size, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          Hiển thị {startItem} đến {endItem} trong tổng số {totalItems} bản ghi
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Số dòng mỗi trang:</span>
          <Select
            value={size.toString()}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            options={sizeOptions.map((s) => ({ value: s.toString(), label: s.toString() }))}
            className="w-20"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Trước
        </Button>
        <span className="text-sm text-muted-foreground">
          Trang {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Sau
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
