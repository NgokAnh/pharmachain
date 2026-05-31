import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
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
import { Search, Eye, Trash2, Plus, RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { toast } from 'sonner';
import { Customer } from '../../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../app/components/ui/dialog';
import { CustomerForm } from './CustomerForm';

export function CustomerList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);

  const fetchCustomers = async (searchQuery?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('pharmacy_token');
      if (!token) throw new Error('Phiên đăng nhập đã hết.');

      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`http://localhost:3000/api/customers?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Lỗi ${response.status}`);
      }

      const data = await response.json();
      setCustomers(data);
    } catch (err: any) {
      const msg =
        err instanceof TypeError
          ? 'Không thể kết nối máy chủ. Vui lòng kiểm tra Backend.'
          : err.message || 'Không thể tải danh sách khách hàng.';
      setError(msg);
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchCustomers(search || undefined);
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleDelete = async (customer: Customer) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa khách hàng "${customer.name}" (${customer.code})?\n\nLưu ý: Không thể xóa khách hàng đã có lịch sử giao dịch.`
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('pharmacy_token');
      const response = await fetch(`http://localhost:3000/api/customers/${customer.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Xóa thất bại');
      }

      toast.success(`Đã xóa khách hàng ${customer.name}.`);
      fetchCustomers(search || undefined);
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa khách hàng.');
    }
  };

  const totalItems = customers.length;
  const totalPages = Math.ceil(totalItems / size);
  const paginatedData = customers.slice((page - 1) * size, page * size);

  const getTierColor = (tier: string) => {
    const colors = {
      bronze: 'default',
      silver: 'info',
      gold: 'warning',
      platinum: 'success',
    };
    return colors[tier as keyof typeof colors] || 'default';
  };

  const getTierLabel = (tier: string) => {
    const labels = {
      bronze: 'Đồng',
      silver: 'Bạc',
      gold: 'Vàng',
      platinum: 'Bạch kim',
    };
    return labels[tier as keyof typeof labels] || tier;
  };

  return (
    <div>
      <Header
        title="Khách hàng"
        subtitle="Quản lý khách hàng và chương trình khách hàng thân thiết"
        actions={
          <Button onClick={() => setIsPopupOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm khách hàng
          </Button>
        }
      />

      <div className="p-6">
        <Card>
          <div className="p-4 border-b border-border">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên, số điện thoại hoặc mã khách hàng..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchCustomers(search || undefined)}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-6 w-6 animate-spin text-primary mr-3" />
              <span className="text-muted-foreground">Đang tải danh sách khách hàng...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-destructive font-medium mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchCustomers()}>
                <RefreshCw className="h-4 w-4 mr-2" /> Thử lại
              </Button>
            </div>
          ) : customers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {search ? 'Không tìm thấy khách hàng phù hợp.' : 'Chưa có khách hàng nào trong hệ thống.'}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã KH</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead>Số điện thoại</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Hạng thành viên</TableHead>
                    <TableHead>Điểm</TableHead>
                    <TableHead>Ngày tham gia</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-mono text-sm">{customer.code}</TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell className="text-muted-foreground">{customer.email || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={getTierColor(customer.membershipTier) as any}>
                          {getTierLabel(customer.membershipTier)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{customer.points.toLocaleString()}</TableCell>
                      <TableCell>{customer.joinDate}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/customers/${customer.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(customer)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
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
            </>
          )}
        </Card>
      </div>

      <Dialog open={isPopupOpen} onOpenChange={setIsPopupOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Thêm khách hàng mới</DialogTitle>
          </DialogHeader>
          <CustomerForm 
            onClose={() => setIsPopupOpen(false)} 
            onSuccess={() => {
              setIsPopupOpen(false);
              fetchCustomers(search || undefined);
            }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
