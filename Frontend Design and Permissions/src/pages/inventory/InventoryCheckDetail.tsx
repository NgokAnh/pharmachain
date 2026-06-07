import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
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
import { ArrowLeft, Check, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { apiUrl } from '../../config/api';

interface InventoryCheckItem {
  id: string;
  medicineName: string;
  lotNumber: string;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
  reason?: string;
}

interface InventoryCheck {
  id: string;
  checkNumber: string;
  branch: { name: string };
  status: 'pending' | 'approved' | 'cancelled';
  createdBy: string;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  items: InventoryCheckItem[];
}

export function InventoryCheckDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  
  const [check, setCheck] = useState<InventoryCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchCheck = async () => {
      try {
        const token = localStorage.getItem('pharmacy_token');
        const res = await fetch(apiUrl(`/inventory-checks/${id}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setCheck(await res.json());
        } else {
          toast.error('Không tải được thông tin phiếu kiểm kho');
        }
      } catch (err) {
        console.error(err);
        toast.error('Có lỗi xảy ra');
      } finally {
        setLoading(false);
      }
    };
    void fetchCheck();
  }, [id]);

  const handleApprove = async () => {
    if (!check) return;
    
    setActionLoading(true);
    try {
      const token = localStorage.getItem('pharmacy_token');
      const res = await fetch(apiUrl(`/inventory-checks/${check.id}/approve`), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Duyệt phiếu kiểm kho và cập nhật tồn kho thành công!');
        setCheck(await res.json());
      } else {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Lỗi khi duyệt phiếu');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!check) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 font-medium">Không tìm thấy phiếu kiểm kho</p>
        <Button variant="outline" onClick={() => navigate('/inventory/checks')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại danh sách
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Header 
        title={`Phiếu kiểm kho: ${check.checkNumber}`} 
        subtitle={`Chi nhánh: ${check.branch?.name}`} 
      />
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <Button variant="outline" onClick={() => navigate('/inventory/checks')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại
          </Button>

          {check.status === 'pending' && hasPermission('inventory.adjust') && (
            <div className="flex gap-2">
              <Button onClick={handleApprove} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
                <Check className="h-4 w-4 mr-2" /> Duyệt &amp; Cập nhật tồn kho
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Danh sách chênh lệch kiểm kho ({check.items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên thuốc</TableHead>
                    <TableHead>Số lô</TableHead>
                    <TableHead className="text-right">Tồn hệ thống</TableHead>
                    <TableHead className="text-right">Thực tế</TableHead>
                    <TableHead className="text-right">Chênh lệch</TableHead>
                    <TableHead>Lý do lệch</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {check.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.medicineName}</TableCell>
                      <TableCell className="font-mono text-sm">{item.lotNumber}</TableCell>
                      <TableCell className="text-right font-semibold">{item.systemQuantity}</TableCell>
                      <TableCell className="text-right font-semibold">{item.actualQuantity}</TableCell>
                      <TableCell className={`text-right font-bold ${item.difference > 0 ? 'text-green-600' : item.difference < 0 ? 'text-red-600' : ''}`}>
                        {item.difference > 0 ? `+${item.difference}` : item.difference}
                      </TableCell>
                      <TableCell>{item.reason || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thông tin chung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground block">Trạng thái</span>
                <Badge variant={check.status === 'approved' ? 'success' : check.status === 'pending' ? 'warning' : 'destructive'} className="mt-1">
                  {check.status === 'approved' ? 'Đã duyệt' : check.status === 'pending' ? 'Chờ duyệt' : 'Đã hủy'}
                </Badge>
              </div>
              <div>
                <span className="text-sm text-muted-foreground block">Người tạo</span>
                <span className="font-semibold block mt-1">{check.createdBy}</span>
              </div>
              {check.approvedBy && (
                <div>
                  <span className="text-sm text-muted-foreground block">Người duyệt</span>
                  <span className="font-semibold block mt-1">{check.approvedBy}</span>
                </div>
              )}
              <div>
                <span className="text-sm text-muted-foreground block">Ngày tạo</span>
                <span className="font-semibold block mt-1">{new Date(check.createdAt).toLocaleString('vi-VN')}</span>
              </div>
              {check.notes && (
                <div>
                  <span className="text-sm text-muted-foreground block">Ghi chú</span>
                  <p className="mt-1 text-sm bg-slate-50 dark:bg-slate-900 p-2 rounded-md">{check.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
