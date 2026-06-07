import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table, TableHeader, TableBody, TableHead, TableCell, TableRow } from '../../components/ui/Table';
import { Plus, Trash2, Save, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Medicine } from '../../types';
import {
  buildConversionSummary,
  getTransactionUnitOptions,
  getUnitLabel,
  resolveFactorToBaseUnit,
} from '../../utils/medicineUnits';
import { apiUrl } from '../../config/api';

interface PurchaseItem {
  id: string;
  medicineId: string;
  medicineName: string;
  transactionUnit: string;
  baseUnit: string;
  quantity: number;
  conversionFactor: number;
  baseQuantity: number;
  unitPrice: number;
  baseUnitCost: number;
  totalPrice: number;
  expiryDate: string;
  batchNumber: string;
  manufacturingDate: string;
}



export function PurchaseForm() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; code: string }[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isMedicinesLoading, setIsMedicinesLoading] = useState(true);
  const [medicinesError, setMedicinesError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentItem, setCurrentItem] = useState({
    medicineId: '',
    medicineName: '',
    transactionUnit: '',
    quantity: 1,
    unitPrice: 0,
    expiryDate: '',
    batchNumber: '',
    manufacturingDate: '',
  });

  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const selectedMedicine = useMemo(
    () => medicines.find((medicine) => medicine.id === currentItem.medicineId) || null,
    [medicines, currentItem.medicineId]
  );

  const currentUnitOptions = useMemo(
    () => (selectedMedicine ? getTransactionUnitOptions(selectedMedicine) : []),
    [selectedMedicine]
  );

  const filteredMedicines = useMemo(() => {
    if (!supplierId) return [];
    return medicines.filter((medicine) => medicine.supplierId === supplierId);
  }, [medicines, supplierId]);

  useEffect(() => {
    // Reset current selected item when supplier changes to avoid mismatch
    setCurrentItem({
      medicineId: '',
      medicineName: '',
      transactionUnit: '',
      quantity: 1,
      unitPrice: 0,
      expiryDate: '',
      batchNumber: '',
      manufacturingDate: '',
    });
  }, [supplierId]);

  const currentFactor =
    selectedMedicine && currentItem.transactionUnit
      ? resolveFactorToBaseUnit(selectedMedicine, currentItem.transactionUnit)
      : null;
  const currentBaseQuantity =
    currentFactor && currentItem.quantity > 0 ? currentItem.quantity * currentFactor : 0;
  const currentBaseUnitCost =
    currentFactor && currentItem.unitPrice > 0 ? currentItem.unitPrice / currentFactor : 0;

  const loadMedicines = async () => {
    setIsMedicinesLoading(true);
    setMedicinesError(null);

    try {
      const token = localStorage.getItem('pharmacy_token');
      if (!token) {
        throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
      }

      const response = await fetch(apiUrl('/medicines'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Không thể tải danh mục thuốc (${response.status})`);
      }

      const data = await response.json();
      setMedicines(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setMedicines([]);
      setMedicinesError(err.message || 'Không thể tải danh mục thuốc.');
    } finally {
      setIsMedicinesLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const token = localStorage.getItem('pharmacy_token');
      const response = await fetch(apiUrl('/suppliers'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setSuppliers(data);
        }
      }
    } catch (err) {
      console.error('Error loading suppliers:', err);
    }
  };

  useEffect(() => {
    void loadMedicines();
    void loadSuppliers();
  }, []);

  const handleMedicineChange = (medicineId: string) => {
    const medicine = medicines.find((item) => item.id === medicineId);
    const firstUnitOption = medicine ? getTransactionUnitOptions(medicine)[0] : null;

    setCurrentItem((prev) => ({
      ...prev,
      medicineId,
      medicineName: medicine?.name || '',
      transactionUnit: firstUnitOption?.value || '',
    }));
  };

  const handleAddItem = () => {
    if (!selectedMedicine) {
      toast.error('Vui lòng chọn thuốc.');
      return;
    }
    if (!currentItem.transactionUnit || !currentFactor) {
      toast.error('Vui lòng chọn đơn vị nhập hợp lệ.');
      return;
    }
    if (currentItem.quantity <= 0) {
      toast.error('Số lượng phải lớn hơn 0.');
      return;
    }
    if (currentItem.unitPrice <= 0) {
      toast.error('Đơn giá phải lớn hơn 0.');
      return;
    }
    if (!currentItem.batchNumber) {
      toast.error('Vui lòng nhập số lô.');
      return;
    }
    if (!currentItem.expiryDate) {
      toast.error('Vui lòng nhập hạn dùng.');
      return;
    }

    const newItem: PurchaseItem = {
      id: Date.now().toString(),
      medicineId: currentItem.medicineId,
      medicineName: selectedMedicine.name,
      transactionUnit: currentItem.transactionUnit,
      baseUnit: selectedMedicine.unit,
      quantity: currentItem.quantity,
      conversionFactor: currentFactor,
      baseQuantity: currentBaseQuantity,
      unitPrice: currentItem.unitPrice,
      baseUnitCost: currentBaseUnitCost,
      totalPrice: currentItem.quantity * currentItem.unitPrice,
      expiryDate: currentItem.expiryDate,
      batchNumber: currentItem.batchNumber,
      manufacturingDate: currentItem.manufacturingDate,
    };

    setItems((prev) => [...prev, newItem]);
    setCurrentItem({
      medicineId: '',
      medicineName: '',
      transactionUnit: '',
      quantity: 1,
      unitPrice: 0,
      expiryDate: '',
      batchNumber: '',
      manufacturingDate: '',
    });
    toast.success('Đã thêm dòng nhập kho.');
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast.success('Đã xóa dòng sản phẩm.');
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  const handleSubmit = async () => {
    if (!supplierId) {
      toast.error('Vui lòng chọn nhà cung cấp.');
      return;
    }
    if (!invoiceNumber) {
      toast.error('Vui lòng nhập số hóa đơn.');
      return;
    }
    if (items.length === 0) {
      toast.error('Vui lòng thêm ít nhất một sản phẩm.');
      return;
    }

    const supplier = suppliers.find((item) => item.id === supplierId);
    const token = localStorage.getItem('pharmacy_token');
    if (!token) {
      toast.error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(apiUrl('/purchases/receive'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          supplierId,
          supplierName: supplier?.name || '',
          invoiceNumber,
          invoiceDate,
          items: items.map((item) => ({
            medicineId: item.medicineId,
            transactionUnit: item.transactionUnit,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            manufacturingDate: item.manufacturingDate || null,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Không thể ghi nhận phiếu nhập kho.');
      }

      const result = await response.json();
      toast.success(`Đã nhập kho thành công phiếu ${result.invoiceNumber}.`);
      navigate('/inventory');
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ khi nhập kho.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Header
        title="Tạo phiếu nhập kho"
        subtitle="Chọn đơn vị giao dịch theo vỉ, hộp, thùng và hệ thống tự quy đổi về đơn vị cơ sở"
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin phiếu nhập</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Nhà cung cấp *"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">-- Chọn nhà cung cấp --</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Số hóa đơn *"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ví dụ: HD001234"
              />
              <Input
                label="Ngày hóa đơn *"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>Thêm sản phẩm nhập kho</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void loadMedicines()}
                disabled={isMedicinesLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isMedicinesLoading ? 'animate-spin' : ''}`} />
                Tải lại danh mục
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {medicinesError && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {medicinesError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-end">
              <div className="md:col-span-2">
                <Select
                  label="Thuốc *"
                  value={currentItem.medicineId}
                  onChange={(e) => handleMedicineChange(e.target.value)}
                  disabled={isMedicinesLoading || !supplierId}
                >
                  {!supplierId ? (
                    <option value="">-- Vui lòng chọn nhà cung cấp trước --</option>
                  ) : filteredMedicines.length === 0 ? (
                    <option value="">-- Nhà cung cấp này chưa có thuốc nào --</option>
                  ) : (
                    <>
                      <option value="">-- Chọn thuốc --</option>
                      {filteredMedicines.map((medicine) => (
                        <option key={medicine.id} value={medicine.id}>
                          {medicine.code} - {medicine.name}
                        </option>
                      ))}
                    </>
                  )}
                </Select>
              </div>
              <Select
                label="Đơn vị nhập *"
                value={currentItem.transactionUnit}
                onChange={(e) =>
                  setCurrentItem((prev) => ({
                    ...prev,
                    transactionUnit: e.target.value,
                  }))
                }
                disabled={!selectedMedicine}
              >
                <option value="">-- Chọn đơn vị --</option>
                {currentUnitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Input
                label="Số lượng *"
                type="number"
                min="1"
                value={currentItem.quantity}
                onChange={(e) =>
                  setCurrentItem((prev) => ({
                    ...prev,
                    quantity: parseInt(e.target.value) || 0,
                  }))
                }
              />
              <Input
                label="Đơn giá / đơn vị nhập *"
                type="number"
                min="0"
                step="0.01"
                value={currentItem.unitPrice}
                onChange={(e) =>
                  setCurrentItem((prev) => ({
                    ...prev,
                    unitPrice: parseFloat(e.target.value) || 0,
                  }))
                }
              />
              <Input
                label="Số lô *"
                value={currentItem.batchNumber}
                onChange={(e) =>
                  setCurrentItem((prev) => ({
                    ...prev,
                    batchNumber: e.target.value,
                  }))
                }
                placeholder="Ví dụ: LOT001"
              />
              <Input
                label="Ngày sản xuất"
                type="date"
                value={currentItem.manufacturingDate}
                onChange={(e) =>
                  setCurrentItem((prev) => ({
                    ...prev,
                    manufacturingDate: e.target.value,
                  }))
                }
              />
              <Input
                label="Hạn dùng *"
                type="date"
                value={currentItem.expiryDate}
                onChange={(e) =>
                  setCurrentItem((prev) => ({
                    ...prev,
                    expiryDate: e.target.value,
                  }))
                }
              />
            </div>

            {selectedMedicine && currentItem.transactionUnit && currentFactor ? (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                <p>
                  <strong>Quy đổi nhập kho:</strong>{' '}
                  {buildConversionSummary(
                    currentItem.quantity,
                    currentItem.transactionUnit,
                    currentBaseQuantity,
                    selectedMedicine.unit
                  )}
                </p>
                <p className="mt-1">
                  <strong>Giá vốn quy về đơn vị cơ sở:</strong>{' '}
                  {currentBaseUnitCost.toLocaleString('vi-VN')} đ / {getUnitLabel(selectedMedicine.unit)}
                </p>
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button onClick={handleAddItem} disabled={!selectedMedicine}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm vào phiếu
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Danh sách sản phẩm ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Chưa có dòng nhập kho nào. Vui lòng thêm sản phẩm vào phiếu.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thuốc</TableHead>
                      <TableHead>Lô / Hạn dùng</TableHead>
                      <TableHead>Đơn vị nhập</TableHead>
                      <TableHead className="text-right">Số lượng nhập</TableHead>
                      <TableHead className="text-right">Quy đổi cơ sở</TableHead>
                      <TableHead className="text-right">Đơn giá</TableHead>
                      <TableHead className="text-right">Thành tiền</TableHead>
                      <TableHead className="text-center">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.medicineName}</TableCell>
                        <TableCell>
                          <div>{item.batchNumber}</div>
                          <div className="text-xs text-muted-foreground">
                            HSD: {new Date(item.expiryDate).toLocaleDateString('vi-VN')}
                          </div>
                        </TableCell>
                        <TableCell>{getUnitLabel(item.transactionUnit)}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity} {getUnitLabel(item.transactionUnit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.baseQuantity} {getUnitLabel(item.baseUnit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.unitPrice.toLocaleString('vi-VN')} đ
                        </TableCell>
                        <TableCell className="text-right">
                          {item.totalPrice.toLocaleString('vi-VN')} đ
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={6} className="text-right font-semibold">
                        Tổng cộng:
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {calculateTotal().toLocaleString('vi-VN')} đ
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-end">
          <Button
            variant="outline"
            onClick={() => navigate('/purchases')}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4 mr-2" />
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Đang ghi nhận...' : 'Lưu phiếu nhập'}
          </Button>
        </div>
      </div>
    </div>
  );
}
