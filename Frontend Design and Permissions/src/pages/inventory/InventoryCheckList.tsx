import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table';
import { Plus, Search, FileText } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { apiUrl } from '../../config/api';

interface InventoryCheck {
  id: string;
  checkNumber: string;
  branch: { name: string };
  status: 'pending' | 'approved' | 'cancelled';
  createdBy: string;
  approvedBy?: string;
  createdAt: string;
  items: any[];
}

export function InventoryCheckList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [checks, setChecks] = useState<InventoryCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchChecks = async () => {
      try {
        const token = localStorage.getItem('pharmacy_token');
        const res = await fetch(apiUrl('/inventory-checks'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setChecks(await res.json());
        }
      } catch (err) {
        console.error('Lỗi tải phiếu kiểm kho', err);
      } finally {
        setLoading(false);
      }
    };
    void fetchChecks();
  }, []);

  const filteredChecks = checks.filter(c => 
    c.checkNumber.toLowerCase().includes(search.toLowerCase()) || 
    c.branch?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header title="Kiểm kho" subtitle="Danh sách các phiếu kiểm kê kho" />
      <div className="p-6">
        <Card>
          <div className="p-4 border-b border-border flex justify-between items-center">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm mã phiếu, chi nhánh..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {hasPermission('inventory.stocktake') && (
              <Button onClick={() => navigate('/inventory/checks/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Tạo phiếu kiểm kho
              </Button>
            )}
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã phiếu</TableHead>
                  <TableHead>Chi nhánh</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Người tạo</TableHead>
                  <TableHead>Số mặt hàng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">Đang tải...</TableCell>
                  </TableRow>
                ) : filteredChecks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">Không có phiếu kiểm kho nào.</TableCell>
                  </TableRow>
                ) : (
                  filteredChecks.map(check => (
                    <TableRow key={check.id}>
                      <TableCell className="font-medium">{check.checkNumber}</TableCell>
                      <TableCell>{check.branch?.name}</TableCell>
                      <TableCell>{new Date(check.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                      <TableCell>{check.createdBy}</TableCell>
                      <TableCell>{check.items.length}</TableCell>
                      <TableCell>
                        <Badge variant={check.status === 'approved' ? 'success' : check.status === 'pending' ? 'warning' : 'destructive'}>
                          {check.status === 'approved' ? 'Đã duyệt' : check.status === 'pending' ? 'Chờ duyệt' : 'Đã hủy'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/inventory/checks/${check.id}`)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
