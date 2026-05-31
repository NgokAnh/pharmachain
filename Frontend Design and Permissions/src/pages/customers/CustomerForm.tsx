import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

export function CustomerForm({ 
  id: propId, 
  onClose, 
  onSuccess 
}: { 
  id?: string; 
  onClose?: () => void; 
  onSuccess?: () => void; 
} = {}) {
  const navigate = useNavigate();
  const params = useParams();
  const id = propId || params.id;
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    address: '',
    membershipTier: 'bronze',
    points: 0,
    status: 'active',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Load customer data if editing
  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      const loadCustomer = async () => {
        try {
          const token = localStorage.getItem('pharmacy_token');
          const response = await fetch(`http://localhost:3000/api/customers/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.ok) throw new Error('Không thể tải thông tin khách hàng');
          const customer = await response.json();
          setFormData({
            code: customer.code || '',
            name: customer.name || '',
            phone: customer.phone || '',
            email: customer.email || '',
            dateOfBirth: customer.dateOfBirth || '',
            address: customer.address || '',
            membershipTier: customer.membershipTier || 'bronze',
            points: customer.points || 0,
            status: customer.status || 'active',
          });
        } catch (err: any) {
          console.error(err);
          toast.error(err.message || 'Lỗi khi tải thông tin khách hàng.');
          navigate('/customers');
        } finally {
          setLoading(false);
        }
      };
      loadCustomer();
    }
  }, [isEdit, id, navigate]);

  const handleChange = (field: string, value: string | number) => {
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

    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập họ và tên khách hàng';
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^[0-9+()-\s]+$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại chứa ký tự không hợp lệ';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

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
        ? `http://localhost:3000/api/customers/${id}` 
        : `http://localhost:3000/api/customers`;
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
        throw new Error(errorData.error || 'Lưu thông tin khách hàng thất bại');
      }

      toast.success(isEdit ? 'Cập nhật khách hàng thành công!' : 'Tạo khách hàng mới thành công!');
      if (onSuccess) onSuccess();
      if (onClose) onClose();
      else navigate('/customers');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Lỗi kết nối máy chủ API!');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onClose) onClose();
    else navigate('/customers');
  };

  if (loading) {
    return (
      <div>
        {!onClose && (
          <Header
            title={isEdit ? 'Sửa khách hàng' : 'Thêm khách hàng'}
            subtitle={isEdit ? 'Cập nhật thông tin khách hàng' : 'Đăng ký khách hàng mới'}
          />
        )}
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
      {!onClose && (
        <Header
          title={isEdit ? 'Sửa thông tin khách hàng' : 'Thêm khách hàng mới'}
          subtitle={isEdit ? 'Cập nhật thông tin khách hàng thân thiết' : 'Đăng ký thành viên hệ thống tích điểm'}
          actions={
            <Button variant="outline" onClick={handleCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>
          }
        />
      )}

      <div className={onClose ? "p-0" : "p-6"}>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin cá nhân</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Mã khách hàng"
                    placeholder="Hệ thống tự động tạo nếu để trống (CUSXXXX)"
                    value={formData.code}
                    onChange={(e) => handleChange('code', e.target.value)}
                    error={errors.code}
                    disabled={isEdit}
                  />
                  <Select
                    label="Trạng thái tài khoản"
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    options={[
                      { value: 'active', label: 'Hoạt động (Active)' },
                      { value: 'inactive', label: 'Tạm ngưng (Inactive)' },
                    ]}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Họ và tên"
                    placeholder="Nhập đầy đủ họ tên..."
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    error={errors.name}
                    required
                  />
                  <Input
                    label="Số điện thoại"
                    placeholder="VD: 0928123456"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    error={errors.phone}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    placeholder="VD: customer@email.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    error={errors.email}
                  />
                  <Input
                    label="Ngày sinh"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                    error={errors.dateOfBirth}
                  />
                </div>

                <Input
                  label="Địa chỉ thường trú"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/TP..."
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  error={errors.address}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Chương trình khách hàng thân thiết</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Hạng thành viên"
                    value={formData.membershipTier}
                    onChange={(e) => handleChange('membershipTier', e.target.value)}
                    options={[
                      { value: 'bronze', label: 'Hạng Đồng (Bronze)' },
                      { value: 'silver', label: 'Hạng Bạc (Silver)' },
                      { value: 'gold', label: 'Hạng Vàng (Gold)' },
                      { value: 'platinum', label: 'Hạng Bạch kim (Platinum)' },
                    ]}
                    required
                  />
                  <Input
                    label="Điểm tích lũy hiện có"
                    type="number"
                    value={formData.points}
                    onChange={(e) => handleChange('points', parseInt(e.target.value, 10) || 0)}
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  * Hạng thành viên sẽ tự động tính toán lại khi thanh toán đơn hàng (Đồng &lt; 500, Bạc &ge; 500, Vàng &ge; 1000, Bạch kim &ge; 2000 điểm).
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 max-w-4xl">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Hủy bỏ
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                {isEdit ? 'Lưu cập nhật' : 'Đăng ký mới'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
