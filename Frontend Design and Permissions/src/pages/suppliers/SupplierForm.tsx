import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

// Mock data - giống với dữ liệu trong SupplierList
const mockSuppliers = Array.from({ length: 35 }, (_, i) => ({
  id: `sup-${i + 1}`,
  code: `SUP${String(i + 1).padStart(4, '0')}`,
  name: [
    'Công ty TNHH Dược phẩm ABC',
    'Công ty Cổ phần Dược XYZ',
    'Nhà phân phối thuốc MediCare',
    'Công ty TNHH Dược Việt',
    'Tập đoàn Dược phẩm PharmaCorp',
  ][i % 5] + ` ${i}`,
  contactPerson: ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', 'Phạm Thị D', 'Hoàng Văn E'][i % 5],
  phone: `0${Math.floor(Math.random() * 9) + 1}${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
  email: `supplier${i + 1}@example.com`,
  address: [
    'Số 123 Đường ABC, Quận 1, TP.HCM',
    'Số 456 Đường XYZ, Quận Hai Bà Trưng, Hà Nội',
    'Số 789 Đường DEF, Quận Thanh Xuân, Hà Nội',
    'Số 321 Đường GHI, Quận 3, TP.HCM',
    'Số 654 Đường JKL, Quận Cầu Giấy, Hà Nội',
  ][i % 5],
  status: i % 7 === 0 ? 'inactive' : 'active',
  taxCode: `${String(Math.floor(Math.random() * 10000000000)).padStart(10, '0')}`,
  bankAccount: `${String(Math.floor(Math.random() * 10000000000000)).padStart(13, '0')}`,
  bankName: ['Vietcombank - Chi nhánh TP.HCM', 'VietinBank - Chi nhánh Hà Nội', 'BIDV - Chi nhánh TP.HCM'][i % 3],
  paymentTerms: ['0', '7', '15', '30', '45', '60'][i % 6],
  notes: i % 3 === 0 ? 'Nhà cung cấp uy tín, giao hàng đúng hạn' : '',
}));

export function SupplierForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    taxCode: '',
    bankAccount: '',
    bankName: '',
    paymentTerms: '30',
    status: 'active',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Load dữ liệu khi edit
  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      const loadSupplier = async () => {
        try {
          const token = localStorage.getItem('pharmacy_token');
          const response = await fetch(`http://localhost:3000/api/suppliers/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.ok) throw new Error('Không thể tải thông tin nhà cung cấp');
          const supplier = await response.json();
          setFormData({
            code: supplier.code,
            name: supplier.name,
            contactPerson: supplier.contactPerson,
            phone: supplier.phone,
            email: supplier.email || '',
            address: supplier.address,
            taxCode: supplier.taxCode || '',
            bankAccount: supplier.bankAccount || '',
            bankName: supplier.bankName || '',
            paymentTerms: supplier.paymentTerms || '30',
            status: supplier.status,
            notes: supplier.notes || '',
          });
        } catch (err: any) {
          console.error(err);
          toast.error(err.message || 'Lỗi khi tải thông tin nhà cung cấp.');
          navigate('/suppliers');
        } finally {
          setLoading(false);
        }
      };
      loadSupplier();
    }
  }, [isEdit, id, navigate]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập tên nhà cung cấp';
    if (!formData.contactPerson.trim()) newErrors.contactPerson = 'Vui lòng nhập người liên hệ';
    if (!formData.phone.trim()) newErrors.phone = 'Vui lòng nhập số điện thoại';
    else if (!/^0\d{9}$/.test(formData.phone)) newErrors.phone = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)';

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.address.trim()) newErrors.address = 'Vui lòng nhập địa chỉ';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Vui lòng kiểm tra lại thông tin');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('pharmacy_token');
      const url = isEdit 
        ? `http://localhost:3000/api/suppliers/${id}` 
        : `http://localhost:3000/api/suppliers`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lưu thông tin nhà cung cấp thất bại');
      }

      toast.success(isEdit ? 'Cập nhật nhà cung cấp thành công!' : 'Tạo nhà cung cấp mới thành công!');
      navigate('/suppliers');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Lỗi kết nối máy chủ API!');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/suppliers');
  };

  if (loading) {
    return (
      <div>
        <Header
          title={isEdit ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}
          subtitle={isEdit ? 'Cập nhật thông tin nhà cung cấp' : 'Tạo mới nhà cung cấp'}
        />
        <div className="p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={isEdit ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'}
        subtitle={isEdit ? 'Cập nhật thông tin nhà cung cấp' : 'Tạo mới nhà cung cấp'}
        actions={
          <Button variant="outline" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
        }
      />

      <div className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin cơ bản</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Mã nhà cung cấp"
                    placeholder="Tự động tạo nếu bỏ trống (VD: SUP0001)"
                    value={formData.code}
                    onChange={(e) => handleChange('code', e.target.value)}
                    error={errors.code}
                    disabled={isEdit}
                  />
                  <Select
                    label="Trạng thái"
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    options={[
                      { value: 'active', label: 'Hoạt động' },
                      { value: 'inactive', label: 'Ngừng hợp tác' },
                    ]}
                    required
                  />
                </div>

                <Input
                  label="Tên nhà cung cấp"
                  placeholder="VD: Công ty TNHH Dược phẩm ABC"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  error={errors.name}
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Người liên hệ"
                    placeholder="VD: Nguyễn Văn A"
                    value={formData.contactPerson}
                    onChange={(e) => handleChange('contactPerson', e.target.value)}
                    error={errors.contactPerson}
                    required
                  />
                  <Input
                    label="Số điện thoại"
                    placeholder="VD: 0901234567"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    error={errors.phone}
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    placeholder="VD: supplier@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    error={errors.email}
                  />
                </div>

                <Input
                  label="Địa chỉ"
                  placeholder="VD: Số 123 Đường ABC, Quận 1, TP.HCM"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  error={errors.address}
                  required
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Thông tin thanh toán</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Mã số thuế"
                    placeholder="VD: 0123456789"
                    value={formData.taxCode}
                    onChange={(e) => handleChange('taxCode', e.target.value)}
                  />
                  <Select
                    label="Điều khoản thanh toán"
                    value={formData.paymentTerms}
                    onChange={(e) => handleChange('paymentTerms', e.target.value)}
                    options={[
                      { value: '0', label: 'Thanh toán ngay' },
                      { value: '7', label: 'Thanh toán sau 7 ngày' },
                      { value: '15', label: 'Thanh toán sau 15 ngày' },
                      { value: '30', label: 'Thanh toán sau 30 ngày' },
                      { value: '45', label: 'Thanh toán sau 45 ngày' },
                      { value: '60', label: 'Thanh toán sau 60 ngày' },
                    ]}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Số tài khoản"
                    placeholder="VD: 0123456789012"
                    value={formData.bankAccount}
                    onChange={(e) => handleChange('bankAccount', e.target.value)}
                  />
                  <Input
                    label="Ngân hàng"
                    placeholder="VD: Vietcombank - Chi nhánh TP.HCM"
                    value={formData.bankName}
                    onChange={(e) => handleChange('bankName', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ghi chú</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ghi chú thêm</label>
                  <textarea
                    className="w-full min-h-[100px] px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Nhập ghi chú về nhà cung cấp (nếu có)..."
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Hủy
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                {isEdit ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
