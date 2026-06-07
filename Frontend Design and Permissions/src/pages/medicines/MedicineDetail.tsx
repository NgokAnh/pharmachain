import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table';
import { ArrowLeft, Edit } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { InventoryLine, Medicine, StockMovement, MedicinePriceHistory } from '../../types';
import { apiUrl } from '../../config/api';

const unitLabelMap: Record<string, string> = {
  vien: 'Viên',
  vi: 'Vỉ',
  hop: 'Hộp',
  chai: 'Chai',
  lo: 'Lọ',
  tuyp: 'Tuýp',
  thung: 'Thùng',
  ong: 'Ống',
  goi: 'Gói',
  but: 'Bút',
};

const saleCategoryLabel: Record<Medicine['saleCategory'], string> = {
  PRESCRIPTION: 'Thuốc kê đơn',
  OTC: 'Thuốc không kê đơn',
  NON_DRUG: 'Hàng không phải thuốc',
};



const priceChannelLabel: Record<MedicinePriceHistory['channel'], string> = {
  POS: 'Bán tại quầy',
  ONLINE: 'Bán online',
  WHOLESALE: 'Bán sỉ',
};

const movementTypeLabel: Record<StockMovement['movementType'], string> = {
  in: 'Nhập kho',
  out: 'Xuất kho',
  return: 'Trả hàng',
  transfer_in: 'Nhận chuyển kho',
  transfer_out: 'Xuất chuyển kho',
  adjustment: 'Điều chỉnh',
};

function getUnitLabel(unitValue: string) {
  return unitLabelMap[unitValue] || unitValue;
}



function formatUnitConversion(
  conversion: NonNullable<Medicine['unitConversions']>[number]
) {
  return `1 ${getUnitLabel(conversion.fromUnit)} = ${conversion.conversionRate} ${getUnitLabel(conversion.toUnit)}`;
}



export function MedicineDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission('medicine.update');

  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [inventoryLines, setInventoryLines] = useState<InventoryLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      try {
        const token = localStorage.getItem('pharmacy_token');
        
        // 1. Fetch medicine detail
        const medResponse = await fetch(apiUrl(`/medicines/${id}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!medResponse.ok) throw new Error('Không thể tải chi tiết thuốc');
        const medData = await medResponse.json();
        setMedicine(medData);

        // 2. Fetch inventory lots and filter for this medicine
        const invResponse = await fetch(apiUrl('/inventory'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (invResponse.ok) {
          const invData = await invResponse.json();
          if (Array.isArray(invData)) {
            const filteredInv = invData.filter((line: any) => line.medicineId === id);
            setInventoryLines(filteredInv);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [id]);

  if (loading) {
    return (
      <div>
        <Header title="Chi tiết thuốc" subtitle="Đang tải thông tin thuốc..." />
        <div className="p-6 flex items-center justify-center">
          <div className="text-muted-foreground animate-pulse">Đang tải hồ sơ thuốc từ hệ thống...</div>
        </div>
      </div>
    );
  }

  if (!medicine) {
    return (
      <div>
        <Header title="Chi tiết thuốc" subtitle="Không tìm thấy thuốc" />
        <div className="p-6 text-center text-destructive">
          Không tìm thấy thông tin chi tiết thuốc trong cơ sở dữ liệu.
        </div>
      </div>
    );
  }

  const totalAvailable = inventoryLines
    .filter((line) => line.stockStatus === 'AVAILABLE')
    .reduce((sum, line) => sum + line.quantity, 0);

  const totalOnHand = inventoryLines.length > 0 ? inventoryLines.reduce((sum, line) => sum + line.quantity, 0) : 0;

  // Dynamically build movements from database transactions
  const movements: StockMovement[] = (medicine.inventoryTransactions || []).map((tx: any) => {
    let movementType: StockMovement['movementType'] = 'adjustment';
    if (tx.transactionType === 'RECEIPT') movementType = 'in';
    else if (tx.transactionType === 'SALE') movementType = 'out';
    else if (tx.transactionType === 'RETURN_TO_SUPPLIER') movementType = 'return';
    else if (tx.transactionType === 'TRANSFER_IN') movementType = 'transfer_in';
    else if (tx.transactionType === 'TRANSFER_OUT') movementType = 'transfer_out';

    return {
      id: tx.id,
      medicineId: tx.medicineId,
      medicineName: medicine.name,
      lotNumber: tx.inventoryLot?.lotNumber || 'N/A',
      branchId: tx.branchId,
      branchName: tx.branch?.name || 'Chi nhánh',
      movementType,
      quantity: tx.quantity,
      referenceType: tx.referenceType,
      referenceId: tx.referenceId || '',
      referenceNumber: tx.referenceNumber || 'N/A',
      performedBy: tx.createdByUserName || 'Hệ thống',
      performedAt: tx.transactedAt,
      notes: tx.notes || undefined,
    };
  });

  return (
    <div>
      <Header
        title="Chi tiết thuốc"
        subtitle={`${medicine.code} - ${medicine.name}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/medicines')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
            {canUpdate && (
              <Button onClick={() => navigate(`/medicines/${id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Sửa
              </Button>
            )}
          </div>
        }
      />

      <div className="p-6 space-y-6">
        <Card>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tồn có thể bán</p>
              <p className="text-2xl font-semibold">{totalAvailable} {getUnitLabel(medicine.unit)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Giá bán hiện hành</p>
              <p className="text-2xl font-semibold">${medicine.sellPrice.toFixed(2)}</p>
            </div>
            <div className="flex flex-wrap gap-2 items-start">
              <Badge variant="info">{saleCategoryLabel[medicine.saleCategory]}</Badge>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general">Thông tin chung</TabsTrigger>
            <TabsTrigger value="inventory">Tồn kho theo trạng thái</TabsTrigger>
            <TabsTrigger value="price">Lịch sử giá</TabsTrigger>
            <TabsTrigger value="movement">Sổ giao dịch kho</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Danh mục thuốc</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><strong>SKU:</strong> {medicine.code}</div>
                <div><strong>Số đăng ký:</strong> {medicine.registrationNumber || '-'}</div>
                <div><strong>Tên biệt dược:</strong> {medicine.name}</div>
                <div><strong>Nhóm thuốc:</strong> {medicine.category || '-'}</div>
                <div><strong>Hoạt chất:</strong> {medicine.activeIngredient}</div>
                <div><strong>Hàm lượng:</strong> {medicine.strength}</div>
                <div><strong>Dạng bào chế:</strong> {medicine.dosageForm}</div>
                <div><strong>Quy cách đóng gói:</strong> {medicine.packagingSpec}</div>
                <div><strong>Đơn vị tính cơ sở:</strong> {getUnitLabel(medicine.unit)}</div>
                <div><strong>Nhà sản xuất:</strong> {medicine.manufacturer}</div>
                <div><strong>Nước sản xuất:</strong> {medicine.countryOfOrigin}</div>
                <div><strong>Nhà cung cấp:</strong> {medicine.supplierName || 'Không có'}</div>
                <div><strong>Trạng thái:</strong> {medicine.status === 'active' ? 'Đang kinh doanh' : 'Ngừng kinh doanh'}</div>
                <div className="md:col-span-2">
                  <strong>Quy đổi đơn vị chuẩn:</strong>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(medicine.unitConversions || []).map((conversion) => (
                      <Badge key={conversion.id} variant="default">
                        {formatUnitConversion(conversion)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle>Tồn kho tính từ sổ giao dịch</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                    <p className="text-sm text-muted-foreground">Đơn vị quản lý tồn</p>
                    <p className="text-lg font-semibold">{getUnitLabel(medicine.unit)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                    <p className="text-sm text-muted-foreground">Tổng tồn On-hand</p>
                    <p className="text-lg font-semibold">{totalOnHand} {getUnitLabel(medicine.unit)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
                    <p className="text-sm text-muted-foreground">Tồn khả dụng</p>
                    <p className="text-lg font-semibold">{totalAvailable} {getUnitLabel(medicine.unit)}</p>
                  </div>
                </div>
                {inventoryLines.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Không có tồn kho thực tế cho thuốc này.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chi nhánh / Vị trí</TableHead>
                        <TableHead>Lô / HSD</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Số lượng</TableHead>
                        <TableHead>On hand</TableHead>
                        <TableHead>Available</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryLines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>
                            {hasPermission('branch.manage') ? (
                              <span
                                onClick={() => navigate(`/system/branches?editName=${encodeURIComponent(line.branchName || '')}`)}
                                className="cursor-pointer text-primary hover:underline font-medium block"
                              >
                                {line.branchName}
                              </span>
                            ) : (
                              <div>{line.branchName}</div>
                            )}
                            <div className="text-xs text-muted-foreground">{line.locationName}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono">{line.lotNumber}</div>
                            <div className="text-xs text-muted-foreground">{line.expiryDate}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={line.stockStatus === 'AVAILABLE' ? 'success' : 'warning'}>
                              {line.stockStatusLabel}
                            </Badge>
                          </TableCell>
                          <TableCell>{line.quantity} {getUnitLabel(line.unit)}</TableCell>
                          <TableCell>{line.onHand} {getUnitLabel(line.unit)}</TableCell>
                          <TableCell>{line.availableStock} {getUnitLabel(line.unit)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="price">
            <Card>
              <CardHeader>
                <CardTitle>Lịch sử giá và chương trình giá</CardTitle>
              </CardHeader>
              <CardContent>
                {(!medicine.priceHistories || medicine.priceHistories.length === 0) ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Giá mặc định niêm yết: ${medicine.sellPrice.toFixed(2)} (Bán lẻ tại quầy)
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kênh</TableHead>
                        <TableHead>Chi nhánh</TableHead>
                        <TableHead>Giá</TableHead>
                        <TableHead>Chương trình</TableHead>
                        <TableHead>Hiệu lực từ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {medicine.priceHistories.map((price: any) => (
                        <TableRow key={price.id}>
                          <TableCell>{priceChannelLabel[price.channel as keyof typeof priceChannelLabel] || price.channel}</TableCell>
                          <TableCell>
                            {price.branchName && hasPermission('branch.manage') ? (
                              <span
                                onClick={() => navigate(`/system/branches?editName=${encodeURIComponent(price.branchName)}`)}
                                className="cursor-pointer text-primary hover:underline font-medium"
                              >
                                {price.branchName}
                              </span>
                            ) : (
                              price.branchName || 'Toàn chuỗi'
                            )}
                          </TableCell>
                          <TableCell>${price.price.toFixed(2)}</TableCell>
                          <TableCell>{price.priceProgram || 'Giá niêm yết'}</TableCell>
                          <TableCell>{price.effectiveFrom}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movement">
            <Card>
              <CardHeader>
                <CardTitle>Sổ giao dịch kho</CardTitle>
              </CardHeader>
              <CardContent>
                {movements.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Chưa phát sinh giao dịch xuất/nhập kho cho thuốc này.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Thời gian</TableHead>
                        <TableHead>Số tham chiếu</TableHead>
                        <TableHead>Loại</TableHead>
                        <TableHead>Lô</TableHead>
                        <TableHead>Số lượng</TableHead>
                        <TableHead>Thực hiện bởi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((movement) => (
                        <TableRow key={movement.id}>
                          <TableCell>{new Date(movement.performedAt).toLocaleDateString('vi-VN')}</TableCell>
                          <TableCell>{movement.referenceNumber}</TableCell>
                          <TableCell>{movementTypeLabel[movement.movementType as keyof typeof movementTypeLabel] || movement.movementType}</TableCell>
                          <TableCell>{movement.lotNumber}</TableCell>
                          <TableCell>{movement.quantity} {getUnitLabel(medicine.unit)}</TableCell>
                          <TableCell>{movement.performedBy}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
