import { useState, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
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
import { useAuth } from '../../contexts/AuthContext';
import { apiUrl } from '../../config/api';
import {
  Receipt,
  Search,
  Filter,
  Eye,
  Printer,
  Calendar,
  X,
  FileText,
  User,
  Activity,
  Image as ImageIcon,
  Building,
  CheckCircle,
  CloudOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { getOfflineOrders } from '../../utils/offlineStore';

interface SalesOrderItem {
  id: string;
  medicineId: string;
  medicineName: string;
  lotNumber: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
}

interface PrescriptionItem {
  id: string;
  medicineName: string;
  quantity: number;
  dosage: string;
  frequency: string;
  duration: string;
}

interface Prescription {
  id: string;
  prescriptionNumber: string;
  customerId: string;
  doctorName: string;
  prescriptionDate: string;
  imageUrl?: string | null;
  status: string;
  verifiedBy?: string | null;
  verifiedDate?: string | null;
  items: PrescriptionItem[];
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  branchId: string;
  customerId: string | null;
  cashierId: string;
  cashierName: string;
  saleDate: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  status: string;
  prescriptionId?: string | null;
  createdAt: string;
  items: SalesOrderItem[];
  branch: {
    name: string;
    code: string;
  };
  prescription?: Prescription | null;
}

interface Branch {
  id: string;
  code: string;
  name: string;
}

export function InvoiceList() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const isChainLevelUser = user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_CHAIN_MANAGER';

  // Fetch branches for filter (if admin/chain manager)
  useEffect(() => {
    if (isChainLevelUser) {
      const fetchBranches = async () => {
        try {
          const token = localStorage.getItem('pharmacy_token');
          const response = await fetch(apiUrl('/branches'), {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            setBranches(data);
          }
        } catch (err) {
          console.error('Error fetching branches:', err);
        }
      };
      void fetchBranches();
    }
  }, [isChainLevelUser]);

  // Fetch invoices with applied filters
  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('pharmacy_token');
      
      let onlineData: Invoice[] = [];
      if (token) {
        const params = new URLSearchParams();
        if (branchFilter && branchFilter !== 'all') {
          params.append('branchId', branchFilter);
        }
        if (startDate) {
          params.append('startDate', startDate);
        }
        if (endDate) {
          params.append('endDate', endDate);
        }
        if (search) {
          params.append('search', search);
        }

        try {
          const response = await fetch(apiUrl(`/pos/invoices?${params.toString()}`), {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            onlineData = await response.json();
          } else {
            console.warn('Không thể tải danh sách hóa đơn từ server.');
          }
        } catch (e) {
          console.warn('Lỗi kết nối API, có thể đang ngoại tuyến.');
        }
      }

      // Fetch offline orders
      try {
        const offlineOrders = await getOfflineOrders();
        const mappedOffline: Invoice[] = offlineOrders.map(order => {
          const p = order.payload;
          const subtotal = p.cart.reduce((sum: number, item: any) => sum + (item.total || 0), 0);
          
          return {
            id: order.id,
            invoiceNumber: `INV-OFF-${order.timestamp.toString().slice(-6)}`,
            branchId: p.branchId || '',
            customerId: p.customerId,
            cashierId: user?.id || 'offline',
            cashierName: user?.name || 'Bạn',
            saleDate: new Date(order.timestamp).toISOString(),
            subtotal: subtotal,
            discount: 0,
            total: subtotal,
            paymentMethod: p.paymentMethod,
            status: 'OFFLINE_PENDING',
            prescriptionId: p.prescriptionId,
            createdAt: new Date(order.timestamp).toISOString(),
            items: p.cart.map((c: any) => ({
              id: c.id,
              medicineId: c.medicineId,
              medicineName: c.name,
              lotNumber: c.lotNumber,
              quantity: c.quantity,
              unitPrice: c.price,
              discount: c.discount || 0,
              totalPrice: c.total,
              dosage: c.dosage,
              frequency: c.frequency,
              duration: c.duration,
            })),
            branch: { name: 'Chờ đồng bộ...', code: 'OFF' }
          };
        });
        
        // Filter offline orders locally based on search
        let filteredOffline = mappedOffline;
        if (search) {
          const searchLower = search.toLowerCase();
          filteredOffline = mappedOffline.filter(inv => 
            inv.invoiceNumber.toLowerCase().includes(searchLower) ||
            inv.customerId?.toLowerCase().includes(searchLower)
          );
        }

        setInvoices([...filteredOffline, ...onlineData]);
      } catch (err) {
        console.error('Lỗi lấy hóa đơn offline:', err);
        setInvoices(onlineData);
      }
      
    } catch (err) {
      console.error('Error fetching invoices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchInvoices();
  }, [branchFilter, startDate, endDate]);

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      void fetchInvoices();
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setBranchFilter('all');
    setStartDate('');
    setEndDate('');
    // Trigger reloading
    setTimeout(() => {
      void fetchInvoices();
    }, 50);
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Tiền mặt';
      case 'card':
        return 'Thẻ ATM/Visa';
      case 'transfer':
        return 'Chuyển khoản';
      default:
        return method;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Injection of Invoice Print stylesheet to completely overhaul browser print rendering */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-invoice-area, #print-invoice-area * {
            visibility: visible !important;
          }
          #print-invoice-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 20px !important;
            margin: 0 !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <Header
        title="Quản lý hóa đơn bán lẻ"
        subtitle="Tra cứu chi tiết lịch sử giao dịch và đối soát đơn thuốc kê đơn (Rx) tại quầy"
      />

      <div className="p-6 space-y-6">
        {/* Detail Modal View */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
            <Card className="w-full max-w-3xl border border-border shadow-2xl animate-in zoom-in-95 duration-200 bg-card">
              <CardHeader className="bg-primary/5 pb-4 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary animate-pulse" />
                  <CardTitle className="text-lg">Chi tiết Hóa đơn: {selectedInvoice.invoiceNumber}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-1.5" /> In hóa đơn
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6 overflow-y-auto max-h-[75vh]">
                
                {/* Print area */}
                <div id="print-invoice-area" className="space-y-6 bg-card text-card-foreground">
                  <div className="flex justify-between border-b pb-4 border-dashed border-border">
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-xl tracking-tight text-primary">HỆ THỐNG NHÀ THUỐC PHARMACHAIN</h3>
                      <p className="text-xs text-muted-foreground">Chi nhánh: {selectedInvoice.branch?.name} ({selectedInvoice.branch?.code})</p>
                      <p className="text-xs text-muted-foreground">Thời gian bán: {new Date(selectedInvoice.saleDate).toLocaleString()}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-mono text-sm font-bold bg-muted px-2 py-1 rounded">HĐ: {selectedInvoice.invoiceNumber}</div>
                      <p className="text-xs text-muted-foreground">Thu ngân: {selectedInvoice.cashierName}</p>
                      <p className="text-xs text-muted-foreground">Khách hàng: {selectedInvoice.customerId || 'Khách vãng lai'}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-primary" /> Danh sách thuốc/vật tư y tế đã bán
                    </h4>
                    <div className="border rounded-lg overflow-hidden border-border bg-muted/10">
                      <Table>
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            <TableHead className="font-bold">Tên thuốc & Số lô</TableHead>
                            <TableHead className="text-center font-bold">Số lượng</TableHead>
                            <TableHead className="text-right font-bold">Đơn giá</TableHead>
                            <TableHead className="font-bold">Liều dùng (Hướng dẫn sử dụng)</TableHead>
                            <TableHead className="text-right font-bold">Thành tiền</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedInvoice.items.map((item) => (
                            <TableRow key={item.id} className="hover:bg-muted/30">
                              <TableCell className="font-medium text-primary">
                                <div className="font-semibold">{item.medicineName}</div>
                                <div className="text-[10px] font-mono text-muted-foreground mt-0.5">Số lô: {item.lotNumber}</div>
                              </TableCell>
                              <TableCell className="text-center font-bold">{item.quantity}</TableCell>
                              <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                              <TableCell className="text-xs">
                                {item.dosage || item.frequency || item.duration ? (
                                  <div className="bg-primary/5 p-1 px-2 rounded border border-primary/10 text-primary-dark">
                                    <span className="font-semibold">Liều:</span> {item.dosage || '-'} | <span className="font-semibold">Tần suất:</span> {item.frequency || '-'} | <span className="font-semibold">Dùng:</span> {item.duration || '-'}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground italic">Không có hướng dẫn liều dùng</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-bold text-foreground">${item.totalPrice.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <div className="w-64 space-y-1.5 text-sm border-t border-dashed border-border pt-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tổng tiền hàng:</span>
                        <span className="font-semibold">${selectedInvoice.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Giảm giá/Chiết khấu:</span>
                        <span className="text-destructive font-semibold">-${selectedInvoice.discount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-base font-extrabold border-t border-border pt-2 text-primary">
                        <span>Tổng thanh toán:</span>
                        <span>${selectedInvoice.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground pt-1">
                        <span>Hình thức thanh toán:</span>
                        <span>{getPaymentMethodLabel(selectedInvoice.paymentMethod)}</span>
                      </div>
                    </div>
                  </div>

                  {/* INLINE PRESCRIPTION IMAGE RECORD: Automatically rendered inline if there is a prescription attached and contains Rx medicine */}
                  {selectedInvoice.prescriptionId && (
                    <div className="border-t border-dashed border-border pt-6 space-y-4 no-print-section">
                      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl space-y-3">
                        <h4 className="font-bold text-sm text-amber-800 dark:text-amber-300 flex items-center gap-2">
                          <FileText className="h-4.5 w-4.5" /> Toa thuốc kê đơn đối chiếu liên kết (Rx: {selectedInvoice.prescriptionId})
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="text-xs space-y-1">
                              <p className="text-muted-foreground">Bác sĩ chỉ định: <strong className="text-foreground">{selectedInvoice.prescription?.doctorName || 'Dược sĩ tại quầy'}</strong></p>
                              <p className="text-muted-foreground">Ngày kê toa: <strong className="text-foreground">{selectedInvoice.prescription?.prescriptionDate || new Date(selectedInvoice.saleDate).toLocaleDateString()}</strong></p>
                              <p className="text-muted-foreground">Trạng thái: <Badge variant="success">Đã xuất bán (Rx)</Badge></p>
                            </div>
                            <div className="bg-card p-3 rounded-lg border border-border">
                              <p className="text-xs font-semibold mb-1 text-primary">Hoạt chất/Thuốc trong toa đã duyệt:</p>
                              <ul className="text-xs space-y-1 list-disc pl-4">
                                {selectedInvoice.prescription?.items.map((pi) => (
                                  <li key={pi.id}>
                                    <span className="font-medium text-foreground">{pi.medicineName}</span> - SL: <span className="font-semibold">{pi.quantity}</span> ({pi.dosage}, {pi.frequency}, {pi.duration})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Image viewer */}
                          <div className="border border-border/80 rounded-lg overflow-hidden bg-slate-900 flex flex-col justify-between">
                            <div className="p-2 bg-slate-800/80 border-b border-border/40 text-[11px] font-bold text-white flex items-center gap-1.5">
                              <ImageIcon className="h-3.5 w-3.5 text-primary" /> Ảnh chụp toa thuốc pháp lý quầy POS
                            </div>
                            <div className="h-44 bg-slate-900 flex items-center justify-center relative">
                              {selectedInvoice.prescription?.imageUrl ? (
                                <img
                                  src={selectedInvoice.prescription.imageUrl}
                                  alt="Realtime prescription capture"
                                  className="w-full h-full object-contain cursor-zoom-in"
                                  onClick={() => window.open(selectedInvoice.prescription?.imageUrl || '', '_blank')}
                                />
                              ) : (
                                <div className="text-center p-3 text-muted-foreground/60 space-y-1">
                                  <FileText className="h-8 w-8 mx-auto opacity-40" />
                                  <p className="text-[10px] font-mono">NO_IMAGE_ATTACHED.JPG</p>
                                </div>
                              )}
                              <Badge className="absolute bottom-2 right-2 scale-90" variant="success">
                                ✓ Đã ký số hóa
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-border no-print gap-3">
                  <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                    Đóng chi tiết
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search toolbar */}
        <Card className="border border-border shadow bg-card">
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Search className="h-3 w-3" /> Tìm kiếm hóa đơn
                </label>
                <div className="relative">
                  <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Nhập mã HĐ, khách hàng, tên thu ngân..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="pl-10"
                  />
                </div>
              </div>

              {isChainLevelUser && (
                <div className="w-full md:w-56 space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Building className="h-3 w-3" /> Chi nhánh cửa hàng
                  </label>
                  <Select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    options={[
                      { value: 'all', label: 'Tất cả chi nhánh' },
                      ...branches.map((b) => ({ value: b.id, label: b.name })),
                    ]}
                  />
                </div>
              )}

              <div className="w-full md:w-44 space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Từ ngày bán
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="w-full md:w-44 space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Đến ngày bán
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <Button className="w-full md:w-auto" onClick={fetchInvoices}>
                  <Filter className="h-4 w-4 mr-1.5" /> Lọc
                </Button>
                <Button className="w-full md:w-auto" variant="outline" onClick={handleResetFilters}>
                  Làm mới
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice List Table */}
        <Card className="border border-border shadow bg-card overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="font-bold">Mã hóa đơn</TableHead>
                <TableHead className="font-bold">Cửa hàng chi nhánh</TableHead>
                <TableHead className="font-bold">Khách hàng</TableHead>
                <TableHead className="font-bold">Thu ngân bán</TableHead>
                <TableHead className="font-bold">Ngày giao dịch</TableHead>
                <TableHead className="font-bold">Thanh toán</TableHead>
                <TableHead className="font-bold">Thuốc kê đơn</TableHead>
                <TableHead className="text-right font-bold">Tổng thanh toán</TableHead>
                <TableHead className="text-right font-bold">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                    Đang truy vấn lịch sử hóa đơn bán lẻ...
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="font-semibold text-base">Không tìm thấy hóa đơn nào</p>
                    <p className="text-sm mt-1">Vui lòng thay đổi tiêu chí bộ lọc hoặc thực hiện bán hàng tại POS.</p>
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => {
                  const hasRx = invoice.prescriptionId;
                  return (
                    <TableRow key={invoice.id} className="hover:bg-muted/10">
                      <TableCell className="font-mono text-sm font-semibold text-primary">
                        {invoice.status === 'OFFLINE_PENDING' ? (
                          <div className="flex items-center gap-1.5 text-warning">
                            <CloudOff className="h-4 w-4" />
                            {invoice.invoiceNumber}
                          </div>
                        ) : (
                          invoice.invoiceNumber
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {invoice.status === 'OFFLINE_PENDING' ? (
                          <span className="italic text-muted-foreground">{invoice.branch?.name}</span>
                        ) : (
                          invoice.branch?.name || 'Chi nhánh mặc định'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-foreground">{invoice.customerId || 'Khách vãng lai'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {invoice.cashierName}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(invoice.saleDate).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {getPaymentMethodLabel(invoice.paymentMethod)}
                      </TableCell>
                      <TableCell>
                        {hasRx ? (
                          <Badge variant="warning" className="flex items-center gap-1.5 w-fit">
                            <FileText className="h-3 w-3" /> Cần toa (Rx)
                          </Badge>
                        ) : (
                          <Badge variant="success" className="flex items-center gap-1.5 w-fit">
                            <CheckCircle className="h-3 w-3" /> Không toa (OTC)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-extrabold text-primary text-base">
                        ${invoice.total.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelectedInvoice(invoice)}>
                          <Eye className="h-4 w-4 mr-1.5" /> Chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
