import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table';
import {
  Package,
  PackageCheck,
  Search,
  ArrowRight,
  Check,
  Scan,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { apiUrl } from '../../config/api';

interface TransferItem {
  id: string;
  medicineId: string;
  medicineName: string;
  lotNumber: string;
  quantity: number;
  picked?: number;
}

interface Transfer {
  id: string;
  transferNumber: string;
  fromBranchId: string;
  toBranchId: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'in_transit' | 'completed' | 'cancelled';
  requestedBy: string;
  approvedBy: string;
  items: TransferItem[];
}

export function WarehouseOperations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [shipping, setShipping] = useState(false);

  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [pickedQuantities, setPickedQuantities] = useState<Record<string, number>>({});
  const [scanMode, setScanMode] = useState(false);
  const [scanInput, setScanInput] = useState('');

  const getToken = () => localStorage.getItem('pharmacy_token');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [transfersRes, branchesRes] = await Promise.all([
        fetch(apiUrl('/transfers'), {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(apiUrl('/branches'), {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      if (transfersRes.ok) {
        setTransfers(await transfersRes.json());
      }
      if (branchesRes.ok) {
        setBranches(await branchesRes.json());
      }
    } catch (error) {
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const getBranchName = (branchId: string) => {
    return branches.find((b) => b.id === branchId)?.name || branchId;
  };

  // Filter transfers for outbound (xuất kho)
  const outboundTransfers = transfers.filter(
    (t) =>
      (user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_CHAIN_MANAGER' || t.fromBranchId === user?.branchId) &&
      (t.status === 'approved' || t.status === 'in_transit') &&
      (search === '' || t.transferNumber.toLowerCase().includes(search.toLowerCase()))
  );

  // Filter transfers for inbound (nhập kho)
  const inboundTransfers = transfers.filter(
    (t) =>
      (user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_CHAIN_MANAGER' || t.toBranchId === user?.branchId) &&
      t.status === 'in_transit' &&
      (search === '' || t.transferNumber.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelectTransfer = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    const initialPicked: Record<string, number> = {};
    transfer.items.forEach((item) => {
      initialPicked[item.id] = item.picked || 0;
    });
    setPickedQuantities(initialPicked);
  };

  const handleUpdatePicked = (itemId: string, quantity: number) => {
    setPickedQuantities((prev) => ({
      ...prev,
      [itemId]: quantity,
    }));
  };

  const handleScan = () => {
    if (!scanInput.trim() || !selectedTransfer) return;

    const item = selectedTransfer.items.find(
      (i) => i.lotNumber === scanInput.trim() || i.medicineName.toLowerCase().includes(scanInput.toLowerCase())
    );

    if (item) {
      const currentPicked = pickedQuantities[item.id] || 0;
      if (currentPicked < item.quantity) {
        handleUpdatePicked(item.id, currentPicked + 1);
        toast.success(`Đã quét: ${item.medicineName} (${currentPicked + 1}/${item.quantity})`);
      } else {
        toast.warning('Đã đủ số lượng yêu cầu');
      }
    } else {
      toast.error('Không tìm thấy sản phẩm trong phiếu');
    }

    setScanInput('');
  };

  const handleStartShipping = async () => {
    if (!selectedTransfer) return;

    const allPicked = selectedTransfer.items.every(
      (item) => pickedQuantities[item.id] === item.quantity
    );

    if (!allPicked) {
      toast.error('Vui lòng lấy đủ số lượng tất cả sản phẩm');
      return;
    }

    setShipping(true);
    try {
      const res = await fetch(`${API_BASE}/transfers/${selectedTransfer.id}/ship`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Lỗi khi xuất kho');
      }

      toast.success(`Đã xuất kho phiếu ${selectedTransfer.transferNumber}`);
      setSelectedTransfer(null);
      setPickedQuantities({});
      void fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setShipping(false);
    }
  };

  const handleReceiveGoods = (transfer: Transfer) => {
    navigate(`/transfers/${transfer.id}`);
  };

  const renderOutboundView = () => {
    if (selectedTransfer) {
      const allPicked = selectedTransfer.items.every(
        (item) => pickedQuantities[item.id] === item.quantity
      );
      const totalItems = selectedTransfer.items.length;
      const pickedItems = selectedTransfer.items.filter(
        (item) => pickedQuantities[item.id] === item.quantity
      ).length;

      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Phiếu chuyển: {selectedTransfer.transferNumber}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getBranchName(selectedTransfer.fromBranchId)} → {getBranchName(selectedTransfer.toBranchId)}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setSelectedTransfer(null)}>
                  Quay lại danh sách
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <PackageCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <div className="flex-1">
                  <p className="font-medium">Tiến độ lấy hàng</p>
                  <p className="text-sm text-muted-foreground">
                    {pickedItems}/{totalItems} sản phẩm đã lấy đủ
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.round((pickedItems / totalItems) * 100)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Quét mã sản phẩm</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setScanMode(!scanMode)}
                >
                  <Scan className="h-4 w-4 mr-2" />
                  {scanMode ? 'Tắt quét' : 'Bật quét'}
                </Button>
              </div>
            </CardHeader>
            {scanMode && (
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Quét mã vạch hoặc nhập tên thuốc..."
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleScan();
                      }
                    }}
                    autoFocus
                  />
                  <Button onClick={handleScan}>Quét</Button>
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danh sách sản phẩm cần lấy</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>STT</TableHead>
                    <TableHead>Tên thuốc</TableHead>
                    <TableHead>Số lô</TableHead>
                    <TableHead className="text-right">Yêu cầu</TableHead>
                    <TableHead className="text-right">Đã lấy</TableHead>
                    <TableHead className="text-center">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedTransfer.items.map((item, index) => {
                    const picked = pickedQuantities[item.id] || 0;
                    const isComplete = picked === item.quantity;

                    return (
                      <TableRow key={item.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{item.medicineName}</TableCell>
                        <TableCell className="font-mono text-sm">{item.lotNumber}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={picked}
                            onChange={(e) =>
                              handleUpdatePicked(item.id, Math.min(parseInt(e.target.value) || 0, item.quantity))
                            }
                            className="w-20 px-2 py-1 border border-border rounded text-right bg-background"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          {isComplete ? (
                            <Badge variant="success">
                              <Check className="h-3 w-3 mr-1" />
                              Hoàn thành
                            </Badge>
                          ) : (
                            <Badge variant="warning">Chưa đủ</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                <Button variant="outline" onClick={() => setSelectedTransfer(null)}>
                  Hủy
                </Button>
                <Button onClick={handleStartShipping} disabled={!allPicked || shipping}>
                  {shipping ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  {shipping ? 'Đang xuất kho...' : 'Xác nhận xuất kho'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Phiếu cần xuất kho</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo mã phiếu..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground animate-spin mb-4" />
              <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
          ) : outboundTransfers.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">Không có phiếu cần xuất kho</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã phiếu</TableHead>
                  <TableHead>Đến chi nhánh</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Số sản phẩm</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outboundTransfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {transfer.transferNumber}
                    </TableCell>
                    <TableCell>{getBranchName(transfer.toBranchId)}</TableCell>
                    <TableCell>{transfer.requestDate}</TableCell>
                    <TableCell>{transfer.items.length} sản phẩm</TableCell>
                    <TableCell>
                      <Badge variant={transfer.status === 'approved' ? 'info' : 'warning'}>
                        {transfer.status === 'approved' ? 'Đã duyệt - Chờ xuất' : 'Đang vận chuyển'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {transfer.status === 'approved' ? (
                        <Button size="sm" onClick={() => handleSelectTransfer(transfer)}>
                          <Package className="h-4 w-4 mr-2" />
                          Lấy hàng
                        </Button>
                      ) : (
                        <Badge variant="success">Đã xuất kho</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderInboundView = () => {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Phiếu cần nhập kho</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo mã phiếu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground animate-spin mb-4" />
              <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
          ) : inboundTransfers.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">Không có phiếu cần nhập kho</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã phiếu</TableHead>
                  <TableHead>Từ chi nhánh</TableHead>
                  <TableHead>Ngày tạo</TableHead>
                  <TableHead>Số sản phẩm</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inboundTransfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {transfer.transferNumber}
                    </TableCell>
                    <TableCell>{getBranchName(transfer.fromBranchId)}</TableCell>
                    <TableCell>{transfer.requestDate}</TableCell>
                    <TableCell>{transfer.items.length} sản phẩm</TableCell>
                    <TableCell>
                      <Badge variant="info">Đang vận chuyển</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => handleReceiveGoods(transfer)}>
                        <PackageCheck className="h-4 w-4 mr-2" />
                        Xem chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  };

  const stats = {
    pendingOutbound: outboundTransfers.filter((t) => t.status === 'approved').length,
    inTransit: outboundTransfers.filter((t) => t.status === 'in_transit').length,
    pendingInbound: inboundTransfers.length,
  };

  return (
    <div>
      <Header
        title="Xuất nhập kho"
        subtitle="Quản lý xuất và nhập hàng theo phiếu chuyển kho"
      />

      <div className="p-6 space-y-6">
        {!selectedTransfer && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <Package className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chờ xuất kho</p>
                  <h3 className="text-2xl font-semibold">{stats.pendingOutbound}</h3>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <ArrowRight className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Đã xuất - Vận chuyển</p>
                  <h3 className="text-2xl font-semibold">{stats.inTransit}</h3>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <PackageCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Chờ nhập kho</p>
                  <h3 className="text-2xl font-semibold">{stats.pendingInbound}</h3>
                </div>
              </div>
            </Card>
          </div>
        )}

        {!selectedTransfer && (
          <Tabs defaultValue="outbound">
            <TabsList className="mb-6">
              <TabsTrigger value="outbound">Xuất kho</TabsTrigger>
              <TabsTrigger value="inbound">Nhập kho</TabsTrigger>
            </TabsList>

            <TabsContent value="outbound">{renderOutboundView()}</TabsContent>
            <TabsContent value="inbound">{renderInboundView()}</TabsContent>
          </Tabs>
        )}

        {selectedTransfer && renderOutboundView()}
      </div>
    </div>
  );
}
