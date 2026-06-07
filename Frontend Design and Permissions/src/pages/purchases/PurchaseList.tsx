import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
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
import { ShoppingCart, Plus, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { apiUrl } from '../../config/api';

export function PurchaseList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('purchasing.create');

  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReceipt, setExpandedReceipt] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        const token = localStorage.getItem('pharmacy_token');
        const response = await fetch(apiUrl('/purchases'), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Không thể tải danh sách phiếu nhập kho');
        const data = await response.json();
        setReceipts(data);
      } catch (err) {
        console.error(err);
        toast.error('Lỗi khi tải dữ liệu phiếu nhập kho.');
      } finally {
        setLoading(false);
      }
    };
    fetchReceipts();
  }, []);

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const toggleExpand = (invoiceNumber: string) => {
    if (expandedReceipt === invoiceNumber) {
      setExpandedReceipt(null);
    } else {
      setExpandedReceipt(invoiceNumber);
    }
  };

  if (loading) {
    return (
      <div>
        <Header title="Phiếu nhập kho" subtitle="Đang tải dữ liệu phiếu nhập kho..." />
        <div className="p-6 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground animate-pulse">Đang tải danh sách phiếu nhập...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Phiếu nhập kho"
        subtitle="Quản lý lịch sử nhập hàng và theo dõi các lô hàng dược phẩm đã ghi sổ"
        actions={
          canCreate && (
            <Button onClick={() => navigate('/purchases/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo phiếu nhập mới
            </Button>
          )
        }
      />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử nhập kho thực tế ({receipts.length} phiếu)</CardTitle>
          </CardHeader>
          <CardContent>
            {receipts.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Chưa có phiếu nhập nào</h3>
                <p className="text-muted-foreground mb-4">
                  Chưa phát sinh giao dịch nhập kho hoặc ghi nhận lô hàng mới.
                </p>
                {canCreate && (
                  <Button onClick={() => navigate('/purchases/new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo phiếu nhập mới ngay
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Số hóa đơn</TableHead>
                      <TableHead>Nhà cung cấp</TableHead>
                      <TableHead>Chi nhánh nhận</TableHead>
                      <TableHead>Số mặt hàng</TableHead>
                      <TableHead>Ngày hóa đơn / Ngày nhập</TableHead>
                      <TableHead className="text-right">Tổng giá trị nhập</TableHead>
                      <TableHead className="text-center">Trạng thái</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.map((receipt) => {
                      const isExpanded = expandedReceipt === receipt.invoiceNumber;
                      return (
                        <>
                          <TableRow key={receipt.invoiceNumber} className="hover:bg-muted/10 cursor-pointer" onClick={() => toggleExpand(receipt.invoiceNumber)}>
                            <TableCell className="text-center">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </TableCell>
                            <TableCell className="font-mono font-medium">{receipt.invoiceNumber}</TableCell>
                            <TableCell className="font-semibold text-primary">{receipt.supplierName}</TableCell>
                            <TableCell>{receipt.branchName}</TableCell>
                            <TableCell>{receipt.itemCount} sản phẩm</TableCell>
                            <TableCell>{receipt.receivedDate}</TableCell>
                            <TableCell className="text-right font-semibold text-blue-600 dark:text-blue-400">
                              {formatVND(receipt.totalAmount)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="success">Đã nhập kho</Badge>
                            </TableCell>
                          </TableRow>
                          
                          {isExpanded && (
                            <TableRow className="bg-muted/10">
                              <TableCell colSpan={8} className="p-4">
                                <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                                  <h4 className="text-sm font-semibold flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    Chi tiết mặt hàng của phiếu: {receipt.invoiceNumber}
                                  </h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="hover:bg-transparent">
                                        <TableHead>Tên thuốc / Biệt dược</TableHead>
                                        <TableHead className="text-right">Số lượng nhập</TableHead>
                                        <TableHead>Đơn vị cơ sở</TableHead>
                                        <TableHead className="text-right">Giá vốn cơ sở</TableHead>
                                        <TableHead className="text-right">Thành tiền</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {receipt.items.map((item: any, idx: number) => (
                                        <TableRow key={idx} className="hover:bg-transparent">
                                          <TableCell className="font-medium">{item.medicineName}</TableCell>
                                          <TableCell className="text-right">{item.quantity}</TableCell>
                                          <TableCell>{item.unit}</TableCell>
                                          <TableCell className="text-right">{formatVND(item.costPrice)}</TableCell>
                                          <TableCell className="text-right font-semibold">{formatVND(item.totalPrice)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
