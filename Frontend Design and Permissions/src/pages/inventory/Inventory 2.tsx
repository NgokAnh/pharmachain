import { useState, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from '../../components/ui/Table';
import { Card } from '../../components/ui/Card';
import { Search, AlertCircle, Package } from 'lucide-react';
import { apiUrl } from '../../config/api';

interface StockItem {
  id: string;
  medicineCode: string;
  medicineName: string;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  minStock: number;
  costPrice: number;
  sellPrice: number;
}
export function Inventory() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [stock, setStock] = useState<StockItem[]>([]);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const token = localStorage.getItem('pharmacy_token');
        if (!token) return;
        const response = await fetch(apiUrl('/inventory'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          // Map to StockItem structure
          const items: StockItem[] = data.map((lot: any) => ({
            id: lot.id,
            medicineCode: lot.medicineCode,
            medicineName: lot.medicineName,
            lotNumber: lot.lotNumber,
            expiryDate: lot.expiryDate,
            quantity: lot.quantity,
            minStock: 100, // Default minimum safety stock threshold
            costPrice: lot.costPrice,
            sellPrice: lot.sellPrice
          }));
          setStock(items);
        }
      } catch (err) {
        console.error('Error fetching inventory lots:', err);
      }
    };

    fetchInventory();
  }, []);

  const filtered = stock.filter((item) => {
    const matchesSearch =
      search === '' ||
      item.medicineName.toLowerCase().includes(search.toLowerCase()) ||
      item.medicineCode.toLowerCase().includes(search.toLowerCase()) ||
      item.lotNumber.toLowerCase().includes(search.toLowerCase());

    const now = new Date();
    const expiry = new Date(item.expiryDate);
    const daysToExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (filter === 'low_stock') return matchesSearch && item.quantity < item.minStock;
    if (filter === 'expiring') return matchesSearch && daysToExpiry <= 60 && daysToExpiry > 0;
    return matchesSearch;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / size);
  const paginatedData = filtered.slice((page - 1) * size, page * size);

  const getStockStatus = (item: StockItem) => {
    const now = new Date();
    const expiry = new Date(item.expiryDate);
    const daysToExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysToExpiry <= 30) return { text: 'Sắp hết hạn', variant: 'danger' as const };
    if (daysToExpiry <= 60) return { text: 'Gần hết hạn', variant: 'warning' as const };
    if (item.quantity < item.minStock) return { text: 'Tồn kho thấp', variant: 'warning' as const };
    return { text: 'Tốt', variant: 'success' as const };
  };

  return (
    <div>
      <Header title="Tồn kho" subtitle="Quản lý và theo dõi tồn kho" />

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng sản phẩm</p>
                <h3 className="text-2xl font-semibold">{stock.length}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tồn kho thấp</p>
                <h3 className="text-2xl font-semibold">
                  {stock.filter((s) => s.quantity < s.minStock).length}
                </h3>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sắp hết hạn</p>
                <h3 className="text-2xl font-semibold">
                  {
                    stock.filter((s) => {
                      const days = Math.floor(
                        (new Date(s.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                      );
                      return days <= 60 && days > 0;
                    }).length
                  }
                </h3>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="p-4 border-b border-border">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên thuốc, mã hoặc số lô..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'low_stock', label: 'Tồn kho thấp' },
                  { value: 'expiring', label: 'Sắp hết hạn' },
                ]}
                className="w-48"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Tên thuốc</TableHead>
                <TableHead>Số lô</TableHead>
                <TableHead>Số lượng</TableHead>
                <TableHead>Hạn sử dụng</TableHead>
                <TableHead>Giá vốn</TableHead>
                <TableHead>Giá bán</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item) => {
                const status = getStockStatus(item);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-sm">{item.medicineCode}</TableCell>
                    <TableCell className="font-medium">{item.medicineName}</TableCell>
                    <TableCell className="font-mono text-sm">{item.lotNumber}</TableCell>
                    <TableCell>
                      <span
                        className={
                          item.quantity < item.minStock ? 'text-destructive font-semibold' : ''
                        }
                      >
                        {item.quantity}
                      </span>
                      <span className="text-muted-foreground text-xs ml-1">
                        / {item.minStock}
                      </span>
                    </TableCell>
                    <TableCell>{item.expiryDate}</TableCell>
                    <TableCell>${item.costPrice.toFixed(2)}</TableCell>
                    <TableCell>${item.sellPrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.text}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <TablePagination
            page={page}
            size={size}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={setPage}
            onSizeChange={(s) => {
              setSize(s);
              setPage(1);
            }}
          />
        </Card>
      </div>
    </div>
  );
}
