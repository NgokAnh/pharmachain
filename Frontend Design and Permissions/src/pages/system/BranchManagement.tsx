import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Building,
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Receipt,
  Users,
  Package,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import { toast } from 'sonner';
import { Branch } from '../../types';
import { apiUrl } from '../../config/api';

export function BranchManagement() {
  const [searchParams] = useSearchParams();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [viewingBranch, setViewingBranch] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
    email: '',
    status: 'active' as 'active' | 'inactive',
  });

  const loadBranches = async () => {
    try {
      const token = localStorage.getItem('pharmacy_token');
          const response = await fetch(apiUrl('/branches'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Không thể tải danh sách chi nhánh');
      }
      const data = await response.json();
      setBranches(data);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải danh sách chi nhánh từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewBranch = async (id: string) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('pharmacy_token');
      const response = await fetch(apiUrl(`/branches/${id}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Không thể tải chi tiết hoạt động của chi nhánh');
      }
      const data = await response.json();
      setViewingBranch(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Lỗi kết nối máy chủ API!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    if (branches.length > 0) {
      const editId = searchParams.get('editId');
      const editCode = searchParams.get('editCode');
      const editName = searchParams.get('editName');
      const viewId = searchParams.get('viewId');
      const viewName = searchParams.get('viewName');

      if (viewId) {
        handleViewBranch(viewId);
      } else if (viewName) {
        const br = branches.find((b) => b.name.toLowerCase() === viewName.toLowerCase());
        if (br) handleViewBranch(br.id);
      } else {
        let targetBranch: Branch | undefined;
        if (editId) {
          targetBranch = branches.find((b) => b.id === editId);
        } else if (editCode) {
          targetBranch = branches.find((b) => b.code.toLowerCase() === editCode.toLowerCase());
        } else if (editName) {
          targetBranch = branches.find((b) => b.name.toLowerCase() === editName.toLowerCase());
        }

        if (targetBranch) {
          setEditingBranch(targetBranch);
          setFormData({
            code: targetBranch.code,
            name: targetBranch.name,
            address: targetBranch.address,
            phone: targetBranch.phone,
            email: targetBranch.email,
            status: targetBranch.status,
          });
          setShowForm(true);
        }
      }
    }
  }, [branches, searchParams]);

  const filtered = branches.filter(
    (b) =>
      search === '' ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.toLowerCase().includes(search.toLowerCase()) ||
      b.address.toLowerCase().includes(search.toLowerCase()) ||
      b.phone.includes(search)
  );

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / size);
  const paginatedData = filtered.slice((page - 1) * size, page * size);

  const handleEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      code: branch.code,
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      status: branch.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (branch: Branch) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa chi nhánh "${branch.name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('pharmacy_token');
      const response = await fetch(apiUrl(`/branches/${branch.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Xóa chi nhánh thất bại');
      }

      toast.success(`Đã xóa chi nhánh "${branch.name}" thành công!`);
      await loadBranches();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Lỗi kết nối máy chủ API!');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code.trim() || !formData.name.trim() || !formData.address.trim() || !formData.phone.trim() || !formData.email.trim()) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('pharmacy_token');
      const url = editingBranch
        ? apiUrl(`/branches/${editingBranch.id}`)
        : apiUrl('/branches');
      const method = editingBranch ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Thao tác lưu thất bại');
      }

      toast.success(editingBranch ? `Đã cập nhật chi nhánh "${formData.name}"` : `Đã tạo chi nhánh "${formData.name}" thành công!`);
      setShowForm(false);
      setEditingBranch(null);
      setFormData({ code: '', name: '', address: '', phone: '', email: '', status: 'active' });
      await loadBranches();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Lỗi kết nối máy chủ API!');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingBranch(null);
    setFormData({ code: '', name: '', address: '', phone: '', email: '', status: 'active' });
  };

  const stats = {
    total: branches.length,
    active: branches.filter((b) => b.status === 'active').length,
    inactive: branches.filter((b) => b.status === 'inactive').length,
  };

  if (loading && branches.length === 0) {
    return (
      <div>
        <Header title="Quản lý chi nhánh" subtitle="Danh mục chi nhánh hoạt động của hệ thống" />
        <div className="p-6 flex items-center justify-center">
          <div className="text-muted-foreground animate-pulse">Đang tải danh sách chi nhánh...</div>
        </div>
      </div>
    );
  }

  if (viewingBranch) {
    const totalRevenue = (viewingBranch.salesOrders || []).reduce((sum: number, o: any) => sum + o.total, 0);
    const totalOrders = (viewingBranch.salesOrders || []).length;
    const totalStaff = (viewingBranch.users || []).length;
    const totalItems = (viewingBranch.inventoryLots || []).reduce((sum: number, lot: any) => sum + lot.quantity, 0);

    return (
      <div>
        <Header
          title={viewingBranch.name}
          subtitle={`Chi tiết hoạt động của chi nhánh (${viewingBranch.code})`}
          actions={
            <Button variant="outline" onClick={() => setViewingBranch(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại danh sách
            </Button>
          }
        />

        <div className="p-6 space-y-6">
          {/* Top Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng doanh thu</p>
                  <h3 className="text-2xl font-semibold">${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng số đơn hàng</p>
                  <h3 className="text-2xl font-semibold">{totalOrders}</h3>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nhân sự hoạt động</p>
                  <h3 className="text-2xl font-semibold">{totalStaff}</h3>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Package className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tổng sản phẩm tồn</p>
                  <h3 className="text-2xl font-semibold">{totalItems}</h3>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* General Info Card */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Thông tin chi nhánh</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Địa chỉ</p>
                    <p className="text-sm text-muted-foreground">{viewingBranch.address}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Số điện thoại</p>
                    <p className="text-sm text-muted-foreground font-mono">{viewingBranch.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email liên hệ</p>
                    <p className="text-sm text-muted-foreground">{viewingBranch.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Trạng thái hoạt động</p>
                    <Badge variant={viewingBranch.status === 'active' ? 'success' : 'default'}>
                      {viewingBranch.status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs details */}
            <div className="lg:col-span-2 space-y-6">
              <Tabs defaultValue="revenue">
                <TabsList className="w-full justify-start border-b border-border bg-transparent rounded-none p-0 h-auto mb-4">
                  <TabsTrigger
                    value="revenue"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Doanh thu & Hóa đơn
                  </TabsTrigger>
                  <TabsTrigger
                    value="inventory"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Tồn kho chi nhánh
                  </TabsTrigger>
                  <TabsTrigger
                    value="personnel"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-2"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Nhân sự ({totalStaff})
                  </TabsTrigger>
                </TabsList>

                {/* TAB 1: DOANH THU & HÓA ĐƠN */}
                <TabsContent value="revenue">
                  <Card>
                    <CardHeader>
                      <CardTitle>Danh sách hóa đơn đã bán</CardTitle>
                    </CardHeader>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mã hóa đơn</TableHead>
                          <TableHead>Thời gian</TableHead>
                          <TableHead>Thu ngân</TableHead>
                          <TableHead>Sản phẩm</TableHead>
                          <TableHead className="text-right">Tổng thanh toán</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(!viewingBranch.salesOrders || viewingBranch.salesOrders.length === 0) ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                              Chưa có lịch sử giao dịch hóa đơn nào tại chi nhánh này.
                            </TableCell>
                          </TableRow>
                        ) : (
                          viewingBranch.salesOrders.map((order: any) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-mono text-sm font-semibold">{order.invoiceNumber}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(order.saleDate).toLocaleString('vi-VN')}
                              </TableCell>
                              <TableCell>{order.cashierName}</TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                                {order.items.map((item: any) => `${item.medicineName} (x${item.quantity})`).join(', ')}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                ${order.total.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>

                {/* TAB 2: TỒN KHO */}
                <TabsContent value="inventory">
                  <Card>
                    <CardHeader>
                      <CardTitle>Danh sách sản phẩm đang lưu kho</CardTitle>
                    </CardHeader>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mã thuốc</TableHead>
                          <TableHead>Tên thuốc</TableHead>
                          <TableHead>Kệ / Vị trí</TableHead>
                          <TableHead>Lô / Hạn dùng</TableHead>
                          <TableHead className="text-right">Số lượng</TableHead>
                          <TableHead>Trạng thái</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(!viewingBranch.inventoryLots || viewingBranch.inventoryLots.length === 0) ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                              Kho chi nhánh này hiện đang trống.
                            </TableCell>
                          </TableRow>
                        ) : (
                          viewingBranch.inventoryLots.map((lot: any) => (
                            <TableRow key={lot.id}>
                              <TableCell className="font-mono text-sm">{lot.medicine.code}</TableCell>
                              <TableCell className="font-medium">{lot.medicine.name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{lot.location.name}</TableCell>
                              <TableCell className="text-sm">
                                <div className="font-mono">{lot.lotNumber}</div>
                                <div className="text-xs text-muted-foreground">HSD: {lot.expiryDate}</div>
                              </TableCell>
                              <TableCell className="text-right font-mono font-semibold">
                                {lot.quantity} {lot.medicine.unit}
                              </TableCell>
                              <TableCell>
                                <Badge variant={lot.status === 'AVAILABLE' ? 'success' : 'warning'}>
                                  {lot.status === 'AVAILABLE' ? 'Khả dụng' : lot.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>

                {/* TAB 3: NHÂN SỰ */}
                <TabsContent value="personnel">
                  <Card>
                    <CardHeader>
                      <CardTitle>Danh sách nhân viên trực thuộc</CardTitle>
                    </CardHeader>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Họ tên</TableHead>
                          <TableHead>Tên đăng nhập</TableHead>
                          <TableHead>Vai trò</TableHead>
                          <TableHead>Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(!viewingBranch.users || viewingBranch.users.length === 0) ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                              Chưa có tài khoản nhân sự trực thuộc chi nhánh này.
                            </TableCell>
                          </TableRow>
                        ) : (
                          viewingBranch.users.map((u: any) => (
                            <TableRow key={u.id}>
                              <TableCell className="font-medium">{u.name}</TableCell>
                              <TableCell className="font-mono text-sm">{u.username}</TableCell>
                              <TableCell>
                                <Badge variant={u.role === 'ROLE_BRANCH_MANAGER' ? 'info' : 'default'}>
                                  {u.role.replace('ROLE_', '').replace(/_/g, ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div>
        <Header
          title={editingBranch ? 'Sửa chi nhánh' : 'Thêm chi nhánh mới'}
          subtitle="Quản lý danh sách chi nhánh hoạt động của hệ thống"
        />
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>{editingBranch ? 'Thông tin chi nhánh' : 'Tạo chi nhánh mới'}</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Mã chi nhánh"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="VD: CN-Q1, CN-HN-01"
                    required
                    disabled={!!editingBranch}
                  />
                  <Input
                    label="Tên chi nhánh"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Chi nhánh Quận 1"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Số điện thoại"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="VD: 02873001234"
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="VD: cn.q1@pharmacy.com"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Địa chỉ"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="VD: 123 Nguyễn Huệ, Bến Nghé, Quận 1, TP. HCM"
                    required
                  />
                  <Select
                    label="Trạng thái"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                    options={[
                      { value: 'active', label: 'Hoạt động' },
                      { value: 'inactive', label: 'Ngừng hoạt động' },
                    ]}
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Hủy
                  </Button>
                  <Button type="submit">
                    {editingBranch ? 'Cập nhật' : 'Tạo mới'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Quản lý chi nhánh"
        subtitle="Danh mục chi nhánh hoạt động của hệ thống"
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm chi nhánh
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng số chi nhánh</p>
                <h3 className="text-2xl font-semibold">{stats.total}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Building className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                <h3 className="text-2xl font-semibold">{stats.active}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Building className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ngừng hoạt động</p>
                <h3 className="text-2xl font-semibold">{stats.inactive}</h3>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Danh sách chi nhánh</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên, mã, số ĐT, địa chỉ..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10 w-80"
                />
              </div>
            </div>
          </CardHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Tên chi nhánh</TableHead>
                <TableHead>Địa chỉ</TableHead>
                <TableHead>Điện thoại</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    Không tìm thấy chi nhánh nào phù hợp.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-mono text-sm font-semibold">
                      <span
                        onClick={() => handleViewBranch(branch.id)}
                        className="cursor-pointer text-primary hover:underline"
                      >
                        {branch.code}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">
                      <span
                        onClick={() => handleViewBranch(branch.id)}
                        className="cursor-pointer text-primary hover:underline"
                      >
                        {branch.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {branch.address}
                    </TableCell>
                    <TableCell className="text-sm font-mono">{branch.phone}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{branch.email}</TableCell>
                    <TableCell>
                      <Badge variant={branch.status === 'active' ? 'success' : 'default'}>
                        {branch.status === 'active' ? 'Hoạt động' : 'Ngừng'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(branch)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(branch)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
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
