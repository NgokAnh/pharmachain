import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
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
import { Plus, Search, Eye, ArrowRight, Package, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { apiUrl } from '../../config/api';

interface TransferItem {
  id: string;
  medicineId: string;
  medicineName: string;
  lotNumber: string;
  quantity: number;
  receivedQuantity?: number;
}

interface Transfer {
  id: string;
  transferNumber: string;
  fromBranchId: string;
  toBranchId: string;
  fromBranchName?: string;
  toBranchName?: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'in_transit' | 'received' | 'cancelled';
  requestedBy: string;
  approvedBy?: string;
  notes?: string;
  items: TransferItem[];
  createdAt: string;
}

const getToken = () => localStorage.getItem('pharmacy_token');

export function TransferList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('transfer.create');

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadBranches = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/branches'), {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(data.map((b: any) => ({ id: b.id, name: b.name })));
      }
    } catch {
      // branches not critical
    }
  }, []);

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/transfers'), {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Không thể tải danh sách phiếu chuyển kho');
      const data = await res.json();
      setTransfers(data);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
    loadTransfers();
  }, [loadBranches, loadTransfers]);

  const getBranchName = (branchId: string) =>
    branches.find((b) => b.id === branchId)?.name || branchId;

  const filtered = transfers.filter((t) => {
    const fromName = getBranchName(t.fromBranchId).toLowerCase();
    const toName = getBranchName(t.toBranchId).toLowerCase();
    const matchesSearch =
      search === '' ||
      t.transferNumber.toLowerCase().includes(search.toLowerCase()) ||
      fromName.includes(search.toLowerCase()) ||
      toName.includes(search.toLowerCase()) ||
      t.requestedBy.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / size);
  const paginatedData = filtered.slice((page - 1) * size, page * size);

  const getStatusBadge = (status: Transfer['status']) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending:    { variant: 'warning', label: 'Chờ duyệt' },
      approved:   { variant: 'info',    label: 'Đã duyệt' },
      in_transit: { variant: 'info',    label: 'Đang vận chuyển' },
      received:   { variant: 'success', label: 'Đã nhận' },
      cancelled:  { variant: 'default', label: 'Đã hủy' },
    };
    return variants[status] ?? { variant: 'default', label: status };
  };

  const stats = {
    pending:   transfers.filter((t) => t.status === 'pending').length,
    inTransit: transfers.filter((t) => t.status === 'in_transit').length,
    received:  transfers.filter((t) => t.status === 'received').length,
  };

  return (
    <div>
      <Header
        title="Chuyển kho"
        subtitle="Quản lý chuyển kho giữa các chi nhánh"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadTransfers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            {canCreate && (
              <Button onClick={() => navigate('/transfers/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Tạo phiếu chuyển
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Package className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chờ duyệt</p>
                <h3 className="text-2xl font-semibold">{stats.pending}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ArrowRight className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đang vận chuyển</p>
                <h3 className="text-2xl font-semibold">{stats.inTransit}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Package className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đã nhận</p>
                <h3 className="text-2xl font-semibold">{stats.received}</h3>
              </div>
            </div>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <div className="p-4 border-b border-border">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo mã phiếu, chi nhánh, người tạo..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-10"
                />
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                options={[
                  { value: 'all',        label: 'Tất cả trạng thái' },
                  { value: 'pending',    label: 'Chờ duyệt' },
                  { value: 'approved',   label: 'Đã duyệt' },
                  { value: 'in_transit', label: 'Đang vận chuyển' },
                  { value: 'received',   label: 'Đã nhận' },
                  { value: 'cancelled',  label: 'Đã hủy' },
                ]}
                className="w-56"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã phiếu</TableHead>
                <TableHead>Chi nhánh</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead>Số mặt hàng</TableHead>
                <TableHead>Người tạo</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin inline mr-2" />
                    Đang tải dữ liệu...
                  </TableCell>
                </TableRow>
              ) : paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Không tìm thấy phiếu chuyển kho nào.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((transfer) => {
                  const statusInfo = getStatusBadge(transfer.status);
                  return (
                    <TableRow key={transfer.id}>
                      <TableCell className="font-mono text-sm font-medium">
                        {transfer.transferNumber}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{getBranchName(transfer.fromBranchId)}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm font-medium">{getBranchName(transfer.toBranchId)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(transfer.requestDate).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell>{transfer.items.length} sản phẩm</TableCell>
                      <TableCell>{transfer.requestedBy}</TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/transfers/${transfer.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
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
            onSizeChange={(s) => { setSize(s); setPage(1); }}
          />
        </Card>
      </div>
    </div>
  );
}
