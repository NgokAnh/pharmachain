import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table';
import { Card } from '../../components/ui/Card';
import { Plus, Search, Edit, Trash2, RefreshCw } from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface SystemUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  branchId?: string | null;
  branch?: { id: string; name: string } | null;
  createdAt: string;
}

export function UserManagement() {
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async (searchQuery?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('pharmacy_token');
      if (!token) throw new Error('Phiên đăng nhập đã hết.');

      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);

      const response = await fetch(`http://localhost:3000/api/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Lỗi ${response.status}`);
      }

      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      const msg =
        err instanceof TypeError
          ? 'Không thể kết nối máy chủ. Vui lòng kiểm tra Backend.'
          : err.message || 'Không thể tải danh sách người dùng.';
      setError(msg);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers(search || undefined);
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const handleDelete = async (user: SystemUser) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa tài khoản "${user.name}" (${user.username})?`
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('pharmacy_token');
      const response = await fetch(`http://localhost:3000/api/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Xóa thất bại');
      }

      toast.success(`Đã xóa tài khoản ${user.username}.`);
      fetchUsers(search || undefined);
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa người dùng.');
    }
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    const variants = {
      ROLE_ADMIN: 'danger',
      ROLE_CHAIN_MANAGER: 'warning',
      ROLE_BRANCH_MANAGER: 'info',
      ROLE_PHARMACIST: 'success',
      ROLE_WAREHOUSE_STAFF: 'default',
    };
    return variants[role] || 'default';
  };

  const getRoleLabel = (role: UserRole) => {
    const labels: Record<string, string> = {
      ROLE_ADMIN: 'Quản trị viên',
      ROLE_CHAIN_MANAGER: 'Quản lý chuỗi',
      ROLE_BRANCH_MANAGER: 'Quản lý chi nhánh',
      ROLE_PHARMACIST: 'Dược sĩ',
      ROLE_WAREHOUSE_STAFF: 'Nhân viên kho',
    };
    return labels[role] || role;
  };

  return (
    <div>
      <Header
        title="Quản lý người dùng"
        subtitle="Quản lý tài khoản và phân quyền hệ thống"
        actions={
          <Button onClick={() => navigate('/system/users/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm người dùng
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
                  placeholder="Tìm theo tên, tên đăng nhập hoặc email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchUsers(search || undefined)}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-6 w-6 animate-spin text-primary mr-3" />
              <span className="text-muted-foreground">Đang tải danh sách người dùng...</span>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-destructive font-medium mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchUsers()}>
                <RefreshCw className="h-4 w-4 mr-2" /> Thử lại
              </Button>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {search ? 'Không tìm thấy người dùng phù hợp.' : 'Chưa có tài khoản nào trong hệ thống.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên đăng nhập</TableHead>
                  <TableHead>Tên</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Chi nhánh</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-sm">{user.username}</TableCell>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role) as any}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.branch ? (
                        hasAnyPermission(['branch.manage']) ? (
                          <span
                            onClick={() => navigate(`/system/branches?editName=${encodeURIComponent(user.branch!.name)}`)}
                            className="cursor-pointer text-primary hover:underline hover:text-primary/80 font-medium"
                          >
                            {user.branch.name}
                          </span>
                        ) : (
                          <span>{user.branch.name}</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/system/users/${user.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user)}
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
          )}
        </Card>
      </div>
    </div>
  );
}
