import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table';
import {
  ArrowLeft,
  Check,
  X,
  ArrowRight,
  Package,
  Calendar,
  User,
  FileText,
  AlertCircle,
  RefreshCw,
  Truck,
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
  receivedQuantity?: number;
}

interface Transfer {
  id: string;
  transferNumber: string;
  fromBranchId: string;
  toBranchId: string;
  requestDate: string;
  status: 'pending' | 'approved' | 'in_transit' | 'received' | 'cancelled';
  requestedBy: string;
  approvedBy?: string;
  notes?: string;
  items: TransferItem[];
  createdAt: string;
  updatedAt: string;
}

const getToken = () => localStorage.getItem('pharmacy_token');

export function TransferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});

  const loadBranches = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/branches'), {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(data.map((b: any) => ({ id: b.id, name: b.name })));
      }
    } catch {}
  }, []);

  const loadTransfer = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // The transfers API is mounted at /api/transfers (router.get('/transfers', ...))
      const res = await fetch(apiUrl('/transfers'), {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Không thể tải phiếu chuyển kho');
      const allTransfers: Transfer[] = await res.json();
      const found = allTransfers.find((t) => t.id === id);
      if (!found) throw new Error('Không tìm thấy phiếu chuyển kho này');
      setTransfer(found);
      // Init received quantities
      const initQty: Record<string, number> = {};
      found.items.forEach((item) => {
        initQty[item.id] = item.receivedQuantity ?? item.quantity;
      });
      setReceivedQuantities(initQty);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadBranches();
    loadTransfer();
  }, [loadBranches, loadTransfer]);

  const getBranchName = (branchId: string) =>
    branches.find((b) => b.id === branchId)?.name || branchId;

  const getStatusInfo = (status: Transfer['status']) => {
    const statusMap: Record<string, { variant: any; label: string; icon: any }> = {
      pending:    { variant: 'warning', label: 'Chờ duyệt',        icon: AlertCircle },
      approved:   { variant: 'info',    label: 'Đã duyệt',         icon: Check },
      in_transit: { variant: 'info',    label: 'Đang vận chuyển',  icon: Truck },
      received:   { variant: 'success', label: 'Đã nhận',          icon: Check },
      cancelled:  { variant: 'default', label: 'Đã hủy',           icon: X },
    };
    return statusMap[status] ?? { variant: 'default', label: status, icon: AlertCircle };
  };

  const callAction = async (endpoint: string, body?: object) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Thao tác thất bại');
      }
      return await res.json();
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!transfer) return;
    try {
      await callAction(`/transfers/${transfer.id}/approve`);
      toast.success('Đã phê duyệt phiếu chuyển kho');
      await loadTransfer();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleStartTransit = async () => {
    if (!transfer) return;
    try {
      await callAction(`/transfers/${transfer.id}/ship`);
      toast.success('Đã bắt đầu vận chuyển – kho xuất đã được ghi nhận');
      await loadTransfer();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleReceive = async () => {
    if (!transfer) return;
    const receivedItems = transfer.items.map((item) => ({
      itemId: item.id,
      receivedQuantity: receivedQuantities[item.id] ?? item.quantity,
    }));

    const hasInvalid = receivedItems.some((ri) => ri.receivedQuantity < 0);
    if (hasInvalid) {
      toast.error('Số lượng nhận không hợp lệ');
      return;
    }

    try {
      await callAction(`/transfers/${transfer.id}/receive`, { receivedItems });
      toast.success('Xác nhận nhận hàng thành công – tồn kho đã được cập nhật');
      await loadTransfer();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div>
        <Header title="Chi tiết phiếu chuyển kho" subtitle="Đang tải..." />
        <div className="p-6 flex justify-center py-16">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!transfer) {
    return (
      <div>
        <Header title="Không tìm thấy" subtitle="Phiếu chuyển kho không tồn tại" />
        <div className="p-6">
          <Button onClick={() => navigate('/transfers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại danh sách
          </Button>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(transfer.status);
  const StatusIcon = statusInfo.icon;

  const canApprove =
    transfer.status === 'pending' && hasPermission('transfer.approve');

  const canStartTransit =
    transfer.status === 'approved' &&
    hasPermission('transfer.ship') &&
    (user?.branchId === transfer.fromBranchId || hasPermission('transfer.approve'));

  const canReceive =
    transfer.status === 'in_transit' &&
    hasPermission('transfer.receive') &&
    (user?.branchId === transfer.toBranchId || hasPermission('transfer.approve'));

  const canCancel =
    (transfer.status === 'pending' || transfer.status === 'approved') &&
    (hasPermission('transfer.approve') || hasPermission('transfer.create'));

  return (
    <div>
      <Header
        title={`Phiếu chuyển kho ${transfer.transferNumber}`}
        subtitle="Chi tiết phiếu chuyển kho"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadTransfer} disabled={actionLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${actionLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button variant="outline" onClick={() => navigate('/transfers')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Transfer Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Thông tin phiếu chuyển</CardTitle>
              <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Route */}
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Lộ trình chuyển kho</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="font-medium">{getBranchName(transfer.fromBranchId)}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-primary">{getBranchName(transfer.toBranchId)}</span>
                    </div>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Ngày tạo phiếu</p>
                    <p className="font-medium mt-1">
                      {new Date(transfer.requestDate).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>

                {/* Items count */}
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Tổng số sản phẩm</p>
                    <p className="font-medium mt-1">{transfer.items.length} loại</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Requested by */}
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Người tạo phiếu</p>
                    <p className="font-medium mt-1">{transfer.requestedBy}</p>
                  </div>
                </div>

                {transfer.approvedBy && (
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                      <Check className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Người phê duyệt</p>
                      <p className="font-medium mt-1">{transfer.approvedBy}</p>
                    </div>
                  </div>
                )}

                {transfer.notes && (
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Ghi chú</p>
                      <p className="font-medium mt-1">{transfer.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items table */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách sản phẩm</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>STT</TableHead>
                  <TableHead>Tên thuốc</TableHead>
                  <TableHead>Số lô</TableHead>
                  <TableHead className="text-right">Số lượng yêu cầu</TableHead>
                  {canReceive && <TableHead className="text-right">Số lượng nhận thực tế</TableHead>}
                  {transfer.status === 'received' && (
                    <TableHead className="text-right">Đã nhận</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfer.items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.medicineName}</TableCell>
                    <TableCell className="font-mono text-sm">{item.lotNumber}</TableCell>
                    <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                    {canReceive && (
                      <TableCell className="text-right">
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={receivedQuantities[item.id] ?? item.quantity}
                          onChange={(e) =>
                            setReceivedQuantities((prev) => ({
                              ...prev,
                              [item.id]: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-24 px-2 py-1 border border-border rounded text-right bg-background"
                        />
                      </TableCell>
                    )}
                    {transfer.status === 'received' && (
                      <TableCell className="text-right">
                        <span
                          className={
                            item.receivedQuantity !== undefined &&
                            item.receivedQuantity < item.quantity
                              ? 'text-amber-600 font-semibold'
                              : 'text-emerald-600 font-semibold'
                          }
                        >
                          {item.receivedQuantity ?? item.quantity}
                          {item.receivedQuantity !== undefined &&
                            item.receivedQuantity < item.quantity && (
                              <span className="text-xs text-muted-foreground ml-1">
                                (thiếu {item.quantity - item.receivedQuantity})
                              </span>
                            )}
                        </span>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        {(canApprove || canStartTransit || canReceive || canCancel) && (
          <Card>
            <CardContent className="py-4">
              <div className="space-y-4">
                {/* Status info messages */}
                {transfer.status === 'pending' && !canApprove && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      Phiếu đang chờ Quản lý chuỗi phê duyệt.
                    </p>
                  </div>
                )}
                {transfer.status === 'approved' && !canStartTransit && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      Đang chờ Nhân viên kho <strong>{getBranchName(transfer.fromBranchId)}</strong> xuất hàng.
                    </p>
                  </div>
                )}
                {transfer.status === 'in_transit' && !canReceive && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                      <AlertCircle className="h-4 w-4 inline mr-1" />
                      Hàng đang vận chuyển. Chờ <strong>{getBranchName(transfer.toBranchId)}</strong> xác nhận nhận hàng.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 flex-wrap">
                  {canCancel && !canApprove && (
                    <Button variant="outline" disabled={actionLoading}>
                      <X className="h-4 w-4 mr-2" />
                      Hủy phiếu
                    </Button>
                  )}
                  {canApprove && (
                    <>
                      <Button variant="outline" onClick={async () => {
                        setActionLoading(true);
                        toast.info('Đã từ chối phiếu chuyển kho');
                        setActionLoading(false);
                        navigate('/transfers');
                      }} disabled={actionLoading}>
                        <X className="h-4 w-4 mr-2" />
                        Từ chối
                      </Button>
                      <Button onClick={handleApprove} disabled={actionLoading}>
                        <Check className="h-4 w-4 mr-2" />
                        {actionLoading ? 'Đang xử lý...' : 'Phê duyệt'}
                      </Button>
                    </>
                  )}
                  {canStartTransit && (
                    <Button onClick={handleStartTransit} disabled={actionLoading}>
                      <Truck className="h-4 w-4 mr-2" />
                      {actionLoading ? 'Đang xử lý...' : 'Bắt đầu vận chuyển'}
                    </Button>
                  )}
                  {canReceive && (
                    <Button onClick={handleReceive} disabled={actionLoading}>
                      <Check className="h-4 w-4 mr-2" />
                      {actionLoading ? 'Đang xử lý...' : 'Xác nhận nhận hàng'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
