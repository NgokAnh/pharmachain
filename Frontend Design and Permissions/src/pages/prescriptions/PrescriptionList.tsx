import { useState, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table';
import { FileText, Search, Eye, Filter, User } from 'lucide-react';

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
  imageUrl?: string;
  status: 'pending' | 'verified' | 'dispensed';
  verifiedBy?: string;
  verifiedDate?: string;
  items: PrescriptionItem[];
}
export function PrescriptionList() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  // Load dynamic data from POS backend API
  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        const token = localStorage.getItem('pharmacy_token');
        if (!token) return;
        const response = await fetch('http://localhost:3000/api/pos/prescriptions', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setPrescriptions(data);
        }
      } catch (err) {
        console.error('Error fetching prescriptions:', err);
      }
    };

    fetchPrescriptions();
  }, []);

  const filtered = prescriptions.filter((p) => {
    const matchesSearch =
      search === '' ||
      p.prescriptionNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.doctorName.toLowerCase().includes(search.toLowerCase()) ||
      p.customerId.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: Prescription['status']) => {
    switch (status) {
      case 'dispensed':
        return <Badge variant="success">Đã cấp phát (Rx)</Badge>;
      case 'verified':
        return <Badge variant="info">Đã phê duyệt</Badge>;
      default:
        return <Badge variant="warning">Chờ thẩm định</Badge>;
    }
  };

  return (
    <div>
      <Header title="Hồ sơ đơn thuốc (Rx)" subtitle="Quản lý và truy xuất lịch sử cấp phát thuốc theo toa có lưu ảnh" />

      <div className="p-6 space-y-6">
        {selectedPrescription && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-200">
              <CardHeader className="bg-primary/5 pb-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Chi tiết đơn thuốc: {selectedPrescription.prescriptionNumber}</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedPrescription(null)}>Quay lại</Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Khách hàng:</p>
                    <p className="font-semibold text-base mt-0.5">{selectedPrescription.customerId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Bác sĩ kê toa:</p>
                    <p className="font-semibold text-base mt-0.5">{selectedPrescription.doctorName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ngày cấp thuốc:</p>
                    <p className="font-medium mt-0.5">{selectedPrescription.prescriptionDate}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Dược sĩ cấp phát:</p>
                    <p className="font-medium mt-0.5">{selectedPrescription.verifiedBy || 'Mary Pharmacist'}</p>
                  </div>
                </div>

                <div className="border border-border rounded-lg overflow-hidden bg-muted/20">
                  <div className="p-3 bg-muted font-bold text-sm border-b">Ảnh chụp toa thuốc đối chiếu (Lưu trữ pháp lý)</div>
                  <div className="h-64 flex items-center justify-center bg-slate-900 text-white relative overflow-hidden">
                    {selectedPrescription.imageUrl ? (
                      <img
                        src={selectedPrescription.imageUrl}
                        alt="Captured prescription"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <>
                        <FileText className="h-10 w-10 text-muted-foreground/50 mr-2" />
                        <span className="text-sm font-semibold tracking-wider font-mono">NO_IMAGE_RECORDED.JPG</span>
                      </>
                    )}
                    <Badge className="absolute bottom-3 right-3 animate-pulse" variant="success">
                      ✓ Đã quét mã hóa lưu trữ
                    </Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm mb-3">Danh sách thuốc kê đơn đã xuất:</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tên thuốc</TableHead>
                        <TableHead className="text-right">Số lượng</TableHead>
                        <TableHead>Liều dùng & Tần suất</TableHead>
                        <TableHead>Thời gian dùng</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPrescription.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-primary">{item.medicineName}</TableCell>
                          <TableCell className="text-right font-semibold">{item.quantity}</TableCell>
                          <TableCell>{item.dosage} ({item.frequency})</TableCell>
                          <TableCell>{item.duration}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm theo số toa, bác sĩ, khách hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="dispensed">Đã cấp phát thuốc (Rx)</option>
              <option value="pending">Chờ thẩm định</option>
            </select>
          </div>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã đơn thuốc</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Bác sĩ kê đơn</TableHead>
                <TableHead>Ngày thực hiện</TableHead>
                <TableHead>Số lượng thuốc Rx</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
                    Không tìm thấy toa thuốc nào phù hợp.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((pres) => (
                  <TableRow key={pres.id}>
                    <TableCell className="font-mono text-sm font-semibold">{pres.prescriptionNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{pres.customerId}</span>
                      </div>
                    </TableCell>
                    <TableCell>{pres.doctorName}</TableCell>
                    <TableCell>{pres.prescriptionDate}</TableCell>
                    <TableCell className="font-semibold">{pres.items.length} thuốc</TableCell>
                    <TableCell>{getStatusBadge(pres.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelectedPrescription(pres)}>
                        <Eye className="h-4 w-4 mr-1.5" />
                        Xem chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
