import { useState } from 'react';
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
import { Plus, Search, Edit, Lock, Unlock } from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface SystemUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  branchName?: string;
  status: 'active' | 'inactive';
}

const mockUsers: SystemUser[] = [
  {
    id: '1',
    username: 'admin',
    name: 'System Admin',
    email: 'admin@pharmacy.com',
    role: 'ROLE_ADMIN',
    status: 'active',
  },
  {
    id: '2',
    username: 'chain_manager',
    name: 'John Chain',
    email: 'john@pharmacy.com',
    role: 'ROLE_CHAIN_MANAGER',
    status: 'active',
  },
  {
    id: '3',
    username: 'branch_manager',
    name: 'Jane Branch',
    email: 'jane@pharmacy.com',
    role: 'ROLE_BRANCH_MANAGER',
    branchName: 'Downtown Branch',
    status: 'active',
  },
  {
    id: '4',
    username: 'pharmacist',
    name: 'Mary Pharmacist',
    email: 'mary@pharmacy.com',
    role: 'ROLE_PHARMACIST',
    branchName: 'Downtown Branch',
    status: 'active',
  },
  {
    id: '5',
    username: 'warehouse',
    name: 'Bob Warehouse',
    email: 'bob@pharmacy.com',
    role: 'ROLE_WAREHOUSE_STAFF',
    branchName: 'Downtown Branch',
    status: 'inactive',
  },
];

export function UserManagement() {
  const navigate = useNavigate();
  const { hasAnyPermission } = useAuth();
  const [search, setSearch] = useState('');

  const filtered = mockUsers.filter(
    (u) =>
      search === '' ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, tên đăng nhập hoặc email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên đăng nhập</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Chi nhánh</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-sm">{user.username}</TableCell>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role) as any}>
                      {user.role.replace('ROLE_', '').replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.branchName ? (
                      hasAnyPermission(['branch.manage']) ? (
                        <span
                          onClick={() => navigate(`/system/branches?editName=${encodeURIComponent(user.branchName!)}`)}
                          className="cursor-pointer text-primary hover:underline hover:text-primary/80 font-medium"
                        >
                          {user.branchName}
                        </span>
                      ) : (
                        <span>{user.branchName}</span>
                      )
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'active' ? 'success' : 'default'}>
                      {user.status === 'active' ? 'Hoạt động' : 'Vô hiệu hóa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/system/users/${user.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        {user.status === 'active' ? (
                          <Lock className="h-4 w-4" />
                        ) : (
                          <Unlock className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
