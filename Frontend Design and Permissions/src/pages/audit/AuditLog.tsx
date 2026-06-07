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
import { Search, User, Activity } from 'lucide-react';
import { AuditLog as AuditLogType } from '../../types';
import { apiUrl } from '../../config/api';

const actionTypes = [
  { value: 'create', label: 'Tạo mới', color: 'success' as const },
  { value: 'update', label: 'Cập nhật', color: 'info' as const },
  { value: 'delete', label: 'Xóa', color: 'danger' as const },
  { value: 'view', label: 'Xem', color: 'default' as const },
  { value: 'login', label: 'Đăng nhập', color: 'success' as const },
  { value: 'logout', label: 'Đăng xuất', color: 'default' as const },
  { value: 'export', label: 'Xuất file', color: 'info' as const },
];

const entityTypes = [
  { value: 'medicine', label: 'Thuốc' },
  { value: 'supplier', label: 'Nhà cung cấp' },
  { value: 'purchase', label: 'Đơn nhập hàng' },
  { value: 'sale', label: 'Đơn bán hàng' },
  { value: 'transfer', label: 'Phiếu chuyển kho' },
  { value: 'customer', label: 'Khách hàng' },
  { value: 'user', label: 'Người dùng' },
  { value: 'prescription', label: 'Đơn thuốc' },
  { value: 'inventory', label: 'Tồn kho' },
];

const users = [
  'admin@pharmacy.com',
  'john@pharmacy.com',
  'jane@pharmacy.com',
  'mary@pharmacy.com',
  'bob@pharmacy.com',
];
export function AuditLog() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [logs, setLogs] = useState<AuditLogType[]>([]);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const token = localStorage.getItem('pharmacy_token');
        if (!token) return;
        const response = await fetch(apiUrl('/audit'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setLogs(data);
        }
      } catch (err) {
        console.error('Error fetching audit logs:', err);
      }
    };

    fetchAuditLogs();
  }, []);

  const filtered = logs.filter((log) => {
    const matchesSearch =
      search === '' ||
      log.userName.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.entityId.toLowerCase().includes(search.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;
    const matchesUser = userFilter === 'all' || log.userName === userFilter;

    return matchesSearch && matchesAction && matchesEntity && matchesUser;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / size);
  const paginatedData = filtered.slice((page - 1) * size, page * size);

  const getActionBadge = (action: string) => {
    const actionType = actionTypes.find((a) => a.value === action);
    return actionType || { value: action, label: action, color: 'default' as const };
  };

  const getEntityLabel = (entityType: string) => {
    const entity = entityTypes.find((e) => e.value === entityType);
    return entity?.label || entityType;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const stats = {
    total: logs.length,
    today: logs.filter((l) => {
      const logDate = new Date(l.timestamp);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    }).length,
    uniqueUsers: new Set(logs.map((l) => l.userId)).size,
  };

  return (
    <div>
      <Header title="Nhật ký hệ thống" subtitle="Nhật ký hoạt động và kiểm toán" />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng hoạt động</p>
                <h3 className="text-2xl font-semibold">{stats.total}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hôm nay</p>
                <h3 className="text-2xl font-semibold">{stats.today}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Người dùng hoạt động</p>
                <h3 className="text-2xl font-semibold">{stats.uniqueUsers}</h3>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <div className="p-4 border-b border-border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo người dùng, nội dung..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'Tất cả hành động' },
                  ...actionTypes.map((a) => ({ value: a.value, label: a.label })),
                ]}
              />
              <Select
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'Tất cả đối tượng' },
                  ...entityTypes,
                ]}
              />
              <Select
                value={userFilter}
                onChange={(e) => {
                  setUserFilter(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'Tất cả người dùng' },
                  ...users.map((u) => ({ value: u.split('@')[0], label: u })),
                ]}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Người dùng</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Đối tượng</TableHead>
                <TableHead>Chi tiết</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((log) => {
                const actionBadge = getActionBadge(log.action);
                return (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {formatTimestamp(log.timestamp)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{log.userName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={actionBadge.color}>{actionBadge.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getEntityLabel(log.entityType)}</span>
                    </TableCell>
                    <TableCell className="max-w-md truncate">{log.details}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.ipAddress}
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
