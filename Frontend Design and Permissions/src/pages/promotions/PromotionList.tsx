import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
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
  TableRow,
  TablePagination,
} from '../../components/ui/Table';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Percent,
  RefreshCw,
  Gift,
  Coins,
  Tag,
  Building,
  Users2,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Promotion } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { apiUrl } from '../../config/api';

export function PromotionList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const canManage = hasPermission('promotion.manage');

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('pharmacy_token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const response = await fetch(apiUrl(`/promotions?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Không thể tải danh sách chương trình khuyến mãi');
      }

      const data = await response.json();
      setPromotions(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Lỗi khi kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, [statusFilter, typeFilter]);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchPromotions();
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleDelete = async (promo: Promotion) => {
    if ((promo.usages || 0) > 0) {
      toast.error('Không thể xóa chương trình khuyến mãi đã được sử dụng. Vui lòng chuyển trạng thái sang ngưng hoạt động.');
      return;
    }

    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa chương trình khuyến mãi "${promo.name}" (${promo.code})?`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('pharmacy_token');
      const response = await fetch(apiUrl(`/promotions/${promo.id}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Xóa khuyến mãi thất bại');
      }

      toast.success(`Đã xóa chương trình khuyến mãi "${promo.name}" thành công.`);
      fetchPromotions();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi xóa khuyến mãi.');
    }
  };

  const getPromoTypeLabel = (type: string) => {
    switch (type) {
      case 'percent':
      case 'percent_discount':
        return 'Chiết khấu %';
      case 'fixed':
      case 'fixed_discount':
        return 'Giảm tiền mặt';
      case 'combo':
      case 'buy_gift':
        return 'Mua X tặng Y';
      case 'loyalty':
      case 'loyalty_points':
        return 'Hệ số điểm VIP';
      case 'category_voucher':
        return 'Voucher nhóm hàng';
      default:
        return 'Tích điểm mặc định';
    }
  };

  const getPromoTypeIcon = (type: string) => {
    switch (type) {
      case 'percent':
      case 'percent_discount':
        return <Percent className="h-4 w-4" />;
      case 'combo':
      case 'buy_gift':
        return <Gift className="h-4 w-4" />;
      case 'loyalty':
      case 'loyalty_points':
        return <Coins className="h-4 w-4" />;
      default:
        return <Tag className="h-4 w-4" />;
    }
  };

  const getPromoTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'percent':
      case 'percent_discount':
        return 'success';
      case 'fixed':
      case 'fixed_discount':
        return 'info';
      case 'combo':
      case 'buy_gift':
        return 'warning';
      case 'loyalty':
      case 'loyalty_points':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'expired':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Hoạt động';
      case 'inactive':
        return 'Tạm ngưng';
      case 'expired':
        return 'Hết hạn';
      default:
        return status;
    }
  };

  const filtered = promotions;
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / size);
  const paginatedData = filtered.slice((page - 1) * size, page * size);

  // Statistics counters
  const activePromoCount = promotions.filter((p) => p && p.status === 'active').length;
  const totalUsages = promotions.reduce((sum, p) => sum + (p ? (p.usages || 0) : 0), 0);
  const totalSavings = promotions.reduce((sum, p) => sum + (p ? (p.totalSavings || 0) : 0), 0);

  return (
    <div>
      <Header
        title="Quản lý chương trình khuyến mãi"
        subtitle="Quản lý chiến dịch chiết khấu, combo mua X tặng Y, tích lũy điểm thưởng và voucher theo ngành hàng"
        actions={
          canManage && (
            <Button onClick={() => navigate('/promotions/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm khuyến mãi
            </Button>
          )
        }
      />

      <div className="p-6 space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-card/65 backdrop-blur-md border border-border">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Percent className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chiến dịch hoạt động</p>
                <h3 className="text-2xl font-semibold text-foreground">{activePromoCount} / {promotions.length}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/65 backdrop-blur-md border border-border">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Users2 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng số lượt áp dụng</p>
                <h3 className="text-2xl font-semibold text-foreground">{totalUsages.toLocaleString('vi-VN')} lượt</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/65 backdrop-blur-md border border-border">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Coins className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng ngân sách chiết khấu đã tiết kiệm</p>
                <h3 className="text-2xl font-semibold text-foreground">
                  ${totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters Table */}
        <Card className="border border-border">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Danh sách chương trình ưu đãi</CardTitle>
              
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm theo tên, mã khuyến mãi..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 w-64 h-10"
                  />
                </div>

                <Select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-44 h-10"
                  options={[
                    { value: 'all', label: 'Tất cả loại hình' },
                    { value: 'percent', label: 'Chiết khấu %' },
                    { value: 'fixed', label: 'Giảm tiền mặt' },
                    { value: 'combo', label: 'Mua X tặng Y' },
                    { value: 'loyalty', label: 'Tích điểm VIP' },
                    { value: 'category_voucher', label: 'Voucher nhóm hàng' },
                  ]}
                />

                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-40 h-10"
                  options={[
                    { value: 'all', label: 'Tất cả trạng thái' },
                    { value: 'active', label: 'Đang hoạt động' },
                    { value: 'inactive', label: 'Tạm ngưng' },
                    { value: 'expired', label: 'Hết hạn' },
                  ]}
                />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchPromotions}
                  disabled={loading}
                  className="h-10"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>

          {loading && promotions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="h-6 w-6 animate-spin text-primary mr-3" />
              <span className="text-muted-foreground mt-2">Đang tải danh sách khuyến mãi...</span>
            </div>
          ) : promotions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground border-t border-border">
              {search || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Không tìm thấy chương trình khuyến mãi nào phù hợp bộ lọc.'
                : 'Chưa có chương trình khuyến mãi nào được khởi tạo.'}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã</TableHead>
                    <TableHead>Tên chương trình / Mô tả</TableHead>
                    <TableHead>Phân loại</TableHead>
                    <TableHead className="text-right">Giá trị</TableHead>
                    <TableHead>Thời hạn áp dụng</TableHead>
                    <TableHead>Phạm vi áp dụng</TableHead>
                    <TableHead className="text-right">Đã dùng</TableHead>
                    <TableHead className="text-right">Tiết kiệm</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    {canManage && <TableHead className="text-right">Thao tác</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((promo) => (
                    <TableRow key={promo.id}>
                      <TableCell className="font-mono text-sm font-semibold">{promo.code}</TableCell>
                      <TableCell className="max-w-xs md:max-w-sm py-3">
                        <div className="font-medium text-foreground">{promo.name}</div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5" title={promo.description}>
                          {promo.description || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPromoTypeBadgeVariant(promo.type) as any} className="flex items-center gap-1.5 w-fit">
                          {getPromoTypeIcon(promo.type)}
                          <span>{getPromoTypeLabel(promo.type)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold font-mono">
                        {promo.type === 'percent' || promo.type === 'percent_discount' ? (
                          `${promo.value}%`
                        ) : promo.type === 'loyalty' || promo.type === 'loyalty_points' ? (
                          `x${promo.value}`
                        ) : promo.type === 'combo' || promo.type === 'buy_gift' ? (
                          'Chi tiết'
                        ) : (
                          `$${promo.value}`
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-mono text-xs">
                            {promo.startDate ? promo.startDate : '∞'} → {promo.endDate ? promo.endDate : '∞'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Building className="h-3.5 w-3.5" />
                          <span>CH: {(!promo.targetBranch || promo.targetBranch === 'all') ? 'Tất cả' : promo.targetBranch}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs mt-1">
                          <Users2 className="h-3.5 w-3.5" />
                          <span>KH: {(!promo.targetGroup || promo.targetGroup === 'all') ? 'Tất cả' : promo.targetGroup.split(',').map(g => {
                            const map: Record<string, string> = {
                              normal: 'Khách lẻ',
                              silver: 'Bạc',
                              gold: 'Vàng',
                              platinum: 'Bạch Kim'
                            };
                            const clean = g.trim().toLowerCase();
                            return map[clean] || g.trim().toUpperCase();
                          }).join(', ')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium font-mono">
                        {(promo.usages || 0).toLocaleString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-right font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                        ${(promo.totalSavings || 0).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(promo.status) as any}>
                          {getStatusLabel(promo.status)}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/promotions/${promo.id}/edit`)}
                            >
                              <Edit className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={(promo.usages || 0) > 0}
                              onClick={() => handleDelete(promo)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/5"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
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
    </div>
  );
}
