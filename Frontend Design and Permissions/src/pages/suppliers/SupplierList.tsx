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
  TablePagination,
  TableRow,
} from '../../components/ui/Table';
import { Card } from '../../components/ui/Card';
import { Plus, Search, Edit, Eye, Phone, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Supplier } from '../../types';
import { apiUrl } from '../../config/api';

export function SupplierList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('supplier.create');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');

  const loadSuppliers = async () => {
    try {
      const token = localStorage.getItem('pharmacy_token');
      const response = await fetch(apiUrl('/suppliers'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      }
    } catch (err) {
      console.error('Error loading suppliers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filtered = suppliers.filter(
    (supplier) =>
      search === '' ||
      supplier.name.toLowerCase().includes(search.toLowerCase()) ||
      supplier.code.toLowerCase().includes(search.toLowerCase()) ||
      supplier.contactPerson.toLowerCase().includes(search.toLowerCase()) ||
      supplier.phone.includes(search) ||
      supplier.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / size);
  const paginatedData = filtered.slice((page - 1) * size, page * size);

  if (loading) {
    return (
      <div>
        <Header title="Nhà cung cấp" subtitle="Quản lý thông tin nhà cung cấp" />
        <div className="p-6 flex items-center justify-center">
          <div className="text-muted-foreground animate-pulse">Đang tải danh sách nhà cung cấp từ cơ sở dữ liệu...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Nhà cung cấp"
        subtitle="Quản lý thông tin nhà cung cấp"
        actions={
          canCreate && (
            <Button onClick={() => navigate('/suppliers/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm nhà cung cấp
            </Button>
          )
        }
      />

      <div className="p-6">
        <Card>
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, mã, người liên hệ, số điện thoại..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã NCC</TableHead>
                <TableHead>Tên nhà cung cấp</TableHead>
                <TableHead>Người liên hệ</TableHead>
                <TableHead>Liên hệ</TableHead>
                <TableHead>Địa chỉ</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-mono text-sm">{supplier.code}</TableCell>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{supplier.contactPerson}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{supplier.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span>{supplier.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{supplier.address}</TableCell>
                  <TableCell>
                    <Badge variant={supplier.status === 'active' ? 'success' : 'default'}>
                      {supplier.status === 'active' ? 'Hoạt động' : 'Ngừng hợp tác'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/suppliers/${supplier.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
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
        </Card>
      </div>
    </div>
  );
}
