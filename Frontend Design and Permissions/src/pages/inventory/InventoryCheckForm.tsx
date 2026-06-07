import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { apiUrl } from '../../config/api';

interface CheckItem {
  medicineId: string;
  medicineName: string;
  lotNumber: string;
  systemQuantity: number;
  actualQuantity: number;
  reason: string;
}

export function InventoryCheckForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branchId || '');
  const [items, setItems] = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState('');

  const isAdminOrChainManager = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_CHAIN_MANAGER';

  useEffect(() => {
    if (isAdminOrChainManager) {
      fetch(apiUrl('/branches'), {
        headers: { Authorization: `Bearer ${localStorage.getItem('pharmacy_token')}` }
      })
      .then(res => res.json())
      .then(data => setBranches(data))
      .catch(() => toast.error('Lỗi tải danh sách chi nhánh'));
    }
  }, [isAdminOrChainManager]);

  useEffect(() => {
    if (!selectedBranchId) {
      setItems([]);
      return;
    }
    
    setLoading(true);
    fetch(apiUrl(`/branches/${selectedBranchId}`), {
      headers: { Authorization: `Bearer ${localStorage.getItem('pharmacy_token')}` }
    })
    .then(res => res.json())
    .then(data => {
      const branchLots = data.inventoryLots || [];
      const newItems = branchLots.filter((lot: any) => lot.status === 'AVAILABLE').map((lot: any) => ({
        medicineId: lot.medicineId,
        medicineName: lot.medicine.name,
        lotNumber: lot.lotNumber,
        systemQuantity: lot.quantity || 0,
        actualQuantity: lot.quantity || 0,
        reason: ''
      }));
      setItems(newItems);
    })
    .catch(() => toast.error('Lỗi tải tồn kho chi nhánh'))
    .finally(() => setLoading(false));
  }, [selectedBranchId]);

  const handleUpdateItem = (index: number, field: keyof CheckItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchId) {
      toast.error('Vui lòng chọn chi nhánh');
      return;
    }
    if (items.length === 0) {
      toast.error('Không có mặt hàng nào để kiểm kho');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(apiUrl('/inventory-checks'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pharmacy_token')}`
        },
        body: JSON.stringify({
          branchId: selectedBranchId,
          notes,
          items: items.filter(item => item.actualQuantity !== item.systemQuantity || item.reason !== '')
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Lỗi khi tạo phiếu kiểm kho');
      }

      toast.success('Đã tạo phiếu kiểm kho thành công');
      navigate('/inventory/checks');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Header title="Tạo phiếu kiểm kho" subtitle="Nhập số lượng thực tế tại kho" />
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin phiếu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isAdminOrChainManager ? (
                  <Select
                    label="Chi nhánh kiểm *"
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    options={[
                      { value: '', label: 'Chọn chi nhánh...' },
                      ...branches.map(b => ({ value: b.id, label: b.name }))
                    ]}
                    required
                  />
                ) : (
                  <div>
                    <label className="text-sm font-medium">Chi nhánh</label>
                    <Input value={user?.branchName || ''} disabled className="mt-1" />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Ghi chú</label>
                  <Input 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    placeholder="Lý do kiểm kho..." 
                    className="mt-1" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danh sách sản phẩm ({items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Đang tải tồn kho...</div>
              ) : items.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">Không có dữ liệu tồn kho khả dụng</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên thuốc</TableHead>
                      <TableHead>Số lô</TableHead>
                      <TableHead className="text-right">Tồn hệ thống</TableHead>
                      <TableHead className="text-right w-40">Tồn thực tế</TableHead>
                      <TableHead className="text-right">Chênh lệch</TableHead>
                      <TableHead>Lý do (nếu lệch)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, index) => {
                      const diff = item.actualQuantity - item.systemQuantity;
                      return (
                        <TableRow key={`${item.medicineId}-${item.lotNumber}`}>
                          <TableCell className="font-medium">{item.medicineName}</TableCell>
                          <TableCell className="font-mono text-sm">{item.lotNumber}</TableCell>
                          <TableCell className="text-right bg-slate-50 dark:bg-slate-900 font-semibold">{item.systemQuantity}</TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              min="0"
                              value={item.actualQuantity}
                              onChange={e => handleUpdateItem(index, 'actualQuantity', parseInt(e.target.value) || 0)}
                              className={`text-right ${diff !== 0 ? 'border-amber-500 ring-1 ring-amber-500' : ''}`}
                            />
                          </TableCell>
                          <TableCell className={`text-right font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : ''}`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Lý do lệch..."
                              value={item.reason}
                              onChange={e => handleUpdateItem(index, 'reason', e.target.value)}
                              disabled={diff === 0}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={() => navigate('/inventory/checks')}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Hủy
            </Button>
            <Button type="submit" disabled={loading || submitting || items.length === 0}>
              <Save className="h-4 w-4 mr-2" /> {submitting ? 'Đang lưu...' : 'Gửi phiếu duyệt'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
