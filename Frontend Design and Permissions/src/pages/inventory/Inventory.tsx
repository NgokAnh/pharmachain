import { useState, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
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
import { Search, AlertCircle, Package, RefreshCw } from 'lucide-react';
import { InventoryLine } from '../../types';
import { apiUrl } from '../../config/api';

const LOW_STOCK_THRESHOLD = 50;

export function Inventory() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [stock, setStock] = useState<InventoryLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('pharmacy_token');
      if (!token) {
        throw new Error('Phien dang nhap da het. Vui long dang nhap lai.');
      }

      const response = await fetch(apiUrl('/inventory'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Khong the tai ton kho (${response.status})`);
      }

      const data = await response.json();
      setStock(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Error fetching inventory ledger:', err);
      setError(err.message || 'Khong the tai ton kho.');
      setStock([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInventory();
  }, []);

  const filtered = stock.filter((item) => {
    const matchesSearch =
      search === '' ||
      item.medicineName.toLowerCase().includes(search.toLowerCase()) ||
      item.medicineCode.toLowerCase().includes(search.toLowerCase()) ||
      item.lotNumber.toLowerCase().includes(search.toLowerCase()) ||
      item.locationName.toLowerCase().includes(search.toLowerCase());

    const now = new Date();
    const expiry = new Date(item.expiryDate);
    const daysToExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (filter === 'low_stock') {
      return matchesSearch && item.stockStatus === 'AVAILABLE' && item.availableStock < LOW_STOCK_THRESHOLD;
    }
    if (filter === 'expiring') {
      return matchesSearch && daysToExpiry <= 60 && daysToExpiry > 0;
    }
    if (filter === 'quarantine') {
      return matchesSearch && item.stockStatus === 'QUARANTINE';
    }
    if (filter === 'blocked') {
      return matchesSearch && ['BLOCKED', 'RECALLED', 'DAMAGED', 'EXPIRED'].includes(item.stockStatus);
    }

    return matchesSearch;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / size);
  const paginatedData = filtered.slice((page - 1) * size, page * size);

  const getStockStatusBadge = (item: InventoryLine) => {
    if (item.stockStatus === 'AVAILABLE') return { text: 'San sang ban', variant: 'success' as const };
    if (item.stockStatus === 'RESERVED') return { text: 'Da giu hang', variant: 'warning' as const };
    if (item.stockStatus === 'QUARANTINE') return { text: 'Cho kiem tra', variant: 'warning' as const };
    if (item.stockStatus === 'IN_TRANSIT') return { text: 'Dang chuyen', variant: 'info' as const };
    return { text: item.stockStatusLabel, variant: 'danger' as const };
  };

  const availableLines = stock.filter((item) => item.stockStatus === 'AVAILABLE');
  const expiringLines = stock.filter((item) => {
    const days = Math.floor((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 60 && days > 0;
  });

  return (
    <div>
      <Header title="Ton kho" subtitle="Theo doi ton kho tu so giao dich kho va FEFO" />

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dong ton kho</p>
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
                <p className="text-sm text-muted-foreground">Ton co the ban thap</p>
                <h3 className="text-2xl font-semibold">
                  {availableLines.filter((line) => line.availableStock < LOW_STOCK_THRESHOLD).length}
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
                <p className="text-sm text-muted-foreground">Sap het han</p>
                <h3 className="text-2xl font-semibold">{expiringLines.length}</h3>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="p-4 border-b border-border space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tim theo ten thuoc, SKU, lo, vi tri..."
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
                  { value: 'all', label: 'Tat ca' },
                  { value: 'low_stock', label: 'Ton kha dung thap' },
                  { value: 'expiring', label: 'Sap het han' },
                  { value: 'quarantine', label: 'Cho kiem tra' },
                  { value: 'blocked', label: 'Bi khoa / loi' },
                ]}
                className="w-52"
              />
              <button
                type="button"
                onClick={() => void fetchInventory()}
                className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Tai lai
              </button>
            </div>

            {error && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {error}
              </div>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU / Ten thuoc</TableHead>
                <TableHead>Vi tri</TableHead>
                <TableHead>Lo / HSD</TableHead>
                <TableHead>Trang thai</TableHead>
                <TableHead>On hand</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Chi tiet ton</TableHead>
                <TableHead>Gia von</TableHead>
                <TableHead>Gia ban</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    Dang tai ton kho...
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    Khong co dong ton kho nao phu hop.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => {
                  const status = getStockStatusBadge(item);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-mono text-xs text-muted-foreground">{item.medicineCode}</div>
                          <div className="font-medium">{item.medicineName}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.activeIngredient} • {item.strength} • {item.unit}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.branchName}</div>
                          <div className="text-xs text-muted-foreground">{item.locationName}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-sm">{item.lotNumber}</div>
                        <div className="text-xs text-muted-foreground">{item.expiryDate}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.text}</Badge>
                      </TableCell>
                      <TableCell>{item.onHand}</TableCell>
                      <TableCell>
                        <span className={item.availableStock < LOW_STOCK_THRESHOLD ? 'text-destructive font-semibold' : 'font-semibold'}>
                          {item.availableStock}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        R:{item.reserved} / Q:{item.quarantine} / B:{item.blocked} / X:{item.expired} / D:{item.damaged}
                      </TableCell>
                      <TableCell>${item.costPrice.toFixed(2)}</TableCell>
                      <TableCell>${item.sellPrice.toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <TablePagination
            page={page}
            size={size}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={setPage}
            onSizeChange={(nextSize) => {
              setSize(nextSize);
              setPage(1);
            }}
          />
        </Card>
      </div>
    </div>
  );
}
