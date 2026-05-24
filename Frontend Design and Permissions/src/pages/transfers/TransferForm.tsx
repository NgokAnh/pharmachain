import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table';
import { ArrowLeft, Save, Plus, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

interface InventoryLot {
  id: string;
  lotNumber: string;
  expiryDate: string;
  quantity: number;
  status: string;
}

interface MedicineOption {
  id: string;
  code: string;
  name: string;
  unit: string;
  lots: InventoryLot[];
}

interface TransferItem {
  id: string;
  medicineId: string;
  medicineName: string;
  lotNumber: string;
  availableQuantity: number;
  requestedQuantity: number;
}

const API_BASE = 'http://localhost:3000/api';
const getToken = () => localStorage.getItem('pharmacy_token');

export function TransferForm() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [medicines, setMedicines] = useState<MedicineOption[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    toBranchId: '',
    notes: '',
  });

  const [items, setItems] = useState<TransferItem[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState('');
  const [selectedLot, setSelectedLot] = useState('');
  const [requestedQuantity, setRequestedQuantity] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load branches and inventory lots for the user's branch
  const loadBranches = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/branches`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        // Exclude user's own branch from "to" options
        setBranches(data.map((b: any) => ({ id: b.id, name: b.name })));
      }
    } catch {
      toast.error('Không thể tải danh sách chi nhánh');
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  const loadMedicines = useCallback(async () => {
    if (!user?.branchId) return;
    setLoadingMedicines(true);
    try {
      // Load inventory lots for this branch
      const res = await fetch(`${API_BASE}/branches/${user.branchId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const branchData = await res.json();

      // Group lots by medicine
      const medMap: Record<string, MedicineOption> = {};
      for (const lot of branchData.inventoryLots || []) {
        if (lot.status !== 'AVAILABLE') continue;
        if (!medMap[lot.medicineId]) {
          medMap[lot.medicineId] = {
            id: lot.medicine.id || lot.medicineId,
            code: lot.medicine.code,
            name: lot.medicine.name,
            unit: lot.medicine.unit,
            lots: [],
          };
        }
        // Calculate net quantity from transactions if available, otherwise use a placeholder
        medMap[lot.medicineId].lots.push({
          id: lot.id,
          lotNumber: lot.lotNumber,
          expiryDate: lot.expiryDate,
          quantity: 999, // Will be replaced by actual quantity from transactions
          status: lot.status,
        });
      }

      // Fetch actual quantities via medicines API
      const medsRes = await fetch(`${API_BASE}/medicines?branchId=${user.branchId}&pageSize=200`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (medsRes.ok) {
        const medsData = await medsRes.json();
        const items = medsData.data || medsData.items || medsData;
        // Merge actual stock quantities
        if (Array.isArray(items)) {
          for (const item of items) {
            if (medMap[item.id] && item.stockSummary) {
              medMap[item.id].lots = medMap[item.id].lots.map((lot: any) => ({
                ...lot,
                quantity: item.stockSummary.available || 0,
              }));
            }
          }
        }
      }

      setMedicines(Object.values(medMap).filter((m) => m.lots.length > 0));
    } catch {
      toast.error('Không thể tải danh sách thuốc tồn kho');
    } finally {
      setLoadingMedicines(false);
    }
  }, [user?.branchId]);

  useEffect(() => {
    loadBranches();
    loadMedicines();
  }, [loadBranches, loadMedicines]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
    }
  };

  const selectedMedicineData = medicines.find((m) => m.id === selectedMedicine);
  const availableLots = selectedMedicineData?.lots.filter((l) => l.quantity > 0) || [];

  const handleAddItem = () => {
    if (!selectedMedicine || !selectedLot || !requestedQuantity) {
      toast.error('Vui lòng chọn đầy đủ thông tin');
      return;
    }

    const medicine = medicines.find((m) => m.id === selectedMedicine);
    const lot = medicine?.lots.find((l) => l.lotNumber === selectedLot);
    if (!medicine || !lot) return;

    const quantity = parseInt(requestedQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Số lượng phải lớn hơn 0');
      return;
    }
    if (quantity > lot.quantity) {
      toast.error(`Số lượng không được vượt quá ${lot.quantity} ${medicine.unit}`);
      return;
    }

    // Check duplicate
    const exists = items.find(
      (i) => i.medicineId === medicine.id && i.lotNumber === lot.lotNumber
    );
    if (exists) {
      toast.error('Sản phẩm + lô này đã được thêm');
      return;
    }

    setItems([...items, {
      id: `item-${Date.now()}`,
      medicineId: medicine.id,
      medicineName: `${medicine.name} (${medicine.code})`,
      lotNumber: lot.lotNumber,
      availableQuantity: lot.quantity,
      requestedQuantity: quantity,
    }]);

    setSelectedMedicine('');
    setSelectedLot('');
    setRequestedQuantity('');
    setShowAddItem(false);
    toast.success('Đã thêm sản phẩm vào phiếu');
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter((i) => i.id !== itemId));
  };

  const handleUpdateQuantity = (itemId: string, quantity: string) => {
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) return;
    setItems(items.map((item) => {
      if (item.id !== itemId) return item;
      if (qty > item.availableQuantity) {
        toast.error(`Tối đa ${item.availableQuantity}`);
        return item;
      }
      return { ...item, requestedQuantity: qty };
    }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.toBranchId) newErrors.toBranchId = 'Vui lòng chọn chi nhánh nhận';
    if (!user?.branchId) newErrors.fromBranchId = 'Bạn chưa được gán chi nhánh';
    if (user?.branchId === formData.toBranchId) newErrors.toBranchId = 'Chi nhánh nhận phải khác chi nhánh gửi';
    if (items.length === 0) newErrors.items = 'Vui lòng thêm ít nhất 1 sản phẩm';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Vui lòng kiểm tra lại thông tin');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          toBranchId: formData.toBranchId,
          notes: formData.notes,
          items: items.map((i) => ({
            medicineId: i.medicineId,
            medicineName: i.medicineName,
            lotNumber: i.lotNumber,
            quantity: i.requestedQuantity,
          })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Tạo phiếu chuyển kho thất bại');
      }

      const created = await res.json();
      toast.success(`Tạo phiếu ${created.transferNumber} thành công!`);
      navigate('/transfers');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setSubmitting(false);
    }
  };

  const availableToBranches = branches.filter((b) => b.id !== user?.branchId);
  const fromBranchName = branches.find((b) => b.id === user?.branchId)?.name || user?.branchId || 'N/A';

  return (
    <div>
      <Header
        title="Tạo phiếu chuyển kho"
        subtitle="Tạo phiếu chuyển hàng giữa các chi nhánh"
        actions={
          <Button variant="outline" onClick={() => navigate('/transfers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
        }
      />

      <div className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Transfer Info */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin chuyển kho</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user?.branchId && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      Bạn đang tạo phiếu chuyển từ chi nhánh: <strong>{fromBranchName}</strong>
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Từ chi nhánh</label>
                    <Input value={fromBranchName} disabled className="mt-1" />
                  </div>
                  <Select
                    label="Đến chi nhánh *"
                    value={formData.toBranchId}
                    onChange={(e) => handleChange('toBranchId', e.target.value)}
                    options={
                      loadingBranches
                        ? [{ value: '', label: 'Đang tải...' }]
                        : availableToBranches.map((b) => ({ value: b.id, label: b.name }))
                    }
                    error={errors.toBranchId}
                    required
                    disabled={loadingBranches || !user?.branchId}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Ghi chú</label>
                  <textarea
                    className="w-full min-h-[80px] px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Nhập ghi chú (nếu có)..."
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Danh sách sản phẩm</CardTitle>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowAddItem(!showAddItem)}
                    disabled={!user?.branchId || loadingMedicines}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {loadingMedicines ? 'Đang tải kho...' : 'Thêm sản phẩm'}
                  </Button>
                </div>
                {errors.items && <p className="text-sm text-destructive mt-2">{errors.items}</p>}
              </CardHeader>
              <CardContent className="space-y-4">
                {showAddItem && (
                  <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <Select
                        label="Thuốc"
                        value={selectedMedicine}
                        onChange={(e) => { setSelectedMedicine(e.target.value); setSelectedLot(''); }}
                        options={medicines.length === 0
                          ? [{ value: '', label: 'Không có tồn kho' }]
                          : medicines.map((m) => ({ value: m.id, label: `${m.name} (${m.code})` }))}
                      />
                      <Select
                        label="Số lô"
                        value={selectedLot}
                        onChange={(e) => setSelectedLot(e.target.value)}
                        options={availableLots.map((l) => ({
                          value: l.lotNumber,
                          label: `${l.lotNumber} | HSD: ${l.expiryDate}`,
                        }))}
                        disabled={!selectedMedicine}
                      />
                      <Input
                        label="Số lượng"
                        type="number"
                        min="1"
                        value={requestedQuantity}
                        onChange={(e) => setRequestedQuantity(e.target.value)}
                        placeholder="Nhập số lượng"
                      />
                      <div className="flex items-end gap-2">
                        <Button type="button" onClick={handleAddItem} className="flex-1">
                          Thêm
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => { setShowAddItem(false); setSelectedMedicine(''); setSelectedLot(''); setRequestedQuantity(''); }}
                        >
                          Hủy
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên thuốc</TableHead>
                        <TableHead>Số lô</TableHead>
                        <TableHead className="text-right">Tồn kho</TableHead>
                        <TableHead className="text-right">Số lượng chuyển</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.medicineName}</TableCell>
                          <TableCell className="font-mono text-sm">{item.lotNumber}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{item.availableQuantity}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              min="1"
                              max={item.availableQuantity}
                              value={item.requestedQuantity}
                              onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                              className="w-24 text-right ml-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(item.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Chưa có sản phẩm nào</p>
                  </div>
                )}

                {items.length > 0 && (
                  <div className="flex justify-end pt-4 border-t">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Tổng số loại sản phẩm</p>
                      <p className="text-2xl font-semibold">{items.length}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/transfers')} disabled={submitting}>
                Hủy
              </Button>
              <Button type="submit" disabled={submitting}>
                <Save className="h-4 w-4 mr-2" />
                {submitting ? 'Đang tạo...' : 'Tạo phiếu chuyển'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
