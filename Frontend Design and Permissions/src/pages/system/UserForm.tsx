import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { UserRole } from '../../types';

const branches = [
  { id: 'br-1', name: 'Chi nhánh Quận 1' },
  { id: 'br-2', name: 'Chi nhánh Quận 3' },
  { id: 'br-3', name: 'Chi nhánh Hai Bà Trưng' },
  { id: 'br-4', name: 'Chi nhánh Thanh Xuân' },
  { id: 'br-5', name: 'Chi nhánh Cầu Giấy' },
];

const roles: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'ROLE_ADMIN',
    label: 'Quản trị viên',
    description: 'Toàn quyền quản lý hệ thống',
  },
  {
    value: 'ROLE_CHAIN_MANAGER',
    label: 'Quản lý chuỗi',
    description: 'Quản lý toàn bộ chuỗi nhà thuốc',
  },
  {
    value: 'ROLE_BRANCH_MANAGER',
    label: 'Quản lý chi nhánh',
    description: 'Quản lý một chi nhánh cụ thể',
  },
  {
    value: 'ROLE_PHARMACIST',
    label: 'Dược sĩ',
    description: 'Bán hàng và xác thực đơn thuốc',
  },
  {
    value: 'ROLE_WAREHOUSE_STAFF',
    label: 'Nhân viên kho',
    description: 'Quản lý kho và nhập xuất hàng',
  },
];

// Mock data - giống với UserManagement
const mockUsers = [
  {
    id: '1',
    username: 'admin',
    name: 'System Admin',
    email: 'admin@pharmacy.com',
    phone: '0901234567',
    role: 'ROLE_ADMIN' as UserRole,
    branchId: '',
    branchName: '',
    status: 'active',
  },
  {
    id: '2',
    username: 'chain_manager',
    name: 'John Chain',
    email: 'john@pharmacy.com',
    phone: '0902345678',
    role: 'ROLE_CHAIN_MANAGER' as UserRole,
    branchId: '',
    branchName: '',
    status: 'active',
  },
  {
    id: '3',
    username: 'branch_manager',
    name: 'Jane Branch',
    email: 'jane@pharmacy.com',
    phone: '0903456789',
    role: 'ROLE_BRANCH_MANAGER' as UserRole,
    branchId: 'br-1',
    branchName: 'Downtown Branch',
    status: 'active',
  },
  {
    id: '4',
    username: 'pharmacist',
    name: 'Mary Pharmacist',
    email: 'mary@pharmacy.com',
    phone: '0904567890',
    role: 'ROLE_PHARMACIST' as UserRole,
    branchId: 'br-1',
    branchName: 'Downtown Branch',
    status: 'active',
  },
  {
    id: '5',
    username: 'warehouse',
    name: 'Bob Warehouse',
    email: 'bob@pharmacy.com',
    phone: '0905678901',
    role: 'ROLE_WAREHOUSE_STAFF' as UserRole,
    branchId: 'br-1',
    branchName: 'Downtown Branch',
    status: 'inactive',
  },
];

export function UserForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
    phone: '',
    role: '' as UserRole | '',
    branchId: '',
    status: 'active',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Load dữ liệu khi edit
  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      // Giả lập API call
      setTimeout(() => {
        const user = mockUsers.find((u) => u.id === id);
        if (user) {
          setFormData({
            username: user.username,
            password: '',
            confirmPassword: '',
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            role: user.role,
            branchId: user.branchId || '',
            status: user.status,
          });
        } else {
          toast.error('Không tìm thấy người dùng');
          navigate('/system');
        }
        setLoading(false);
      }, 500);
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

  const requiresBranch = (role: UserRole | '') => {
    return role === 'ROLE_BRANCH_MANAGER' ||
           role === 'ROLE_PHARMACIST' ||
           role === 'ROLE_WAREHOUSE_STAFF';
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Vui lòng nhập tên đăng nhập';
    } else if (formData.username.length < 4) {
      newErrors.username = 'Tên đăng nhập phải có ít nhất 4 ký tự';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Tên đăng nhập chỉ được chứa chữ cái, số và dấu gạch dưới';
    }

    if (!isEdit) {
      if (!formData.password) {
        newErrors.password = 'Vui lòng nhập mật khẩu';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
      }
    }

    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập họ tên';

    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (formData.phone && !/^0\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)';
    }

    if (!formData.role) {
      newErrors.role = 'Vui lòng chọn vai trò';
    }

    if (requiresBranch(formData.role) && !formData.branchId) {
      newErrors.branchId = 'Vui lòng chọn chi nhánh';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Vui lòng kiểm tra lại thông tin');
      return;
    }

    const action = isEdit ? 'Cập nhật' : 'Thêm';
    toast.success(`${action} người dùng thành công!`);
    navigate('/system');
  };

  const handleCancel = () => {
    navigate('/system');
  };

  const selectedRole = roles.find((r) => r.value === formData.role);

  if (loading) {
    return (
      <div>
        <Header
          title={isEdit ? 'Sửa người dùng' : 'Thêm người dùng'}
          subtitle={isEdit ? 'Cập nhật thông tin người dùng' : 'Tạo tài khoản người dùng mới'}
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
        title={isEdit ? 'Sửa người dùng' : 'Thêm người dùng'}
        subtitle={isEdit ? 'Cập nhật thông tin người dùng' : 'Tạo tài khoản người dùng mới'}
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
                <CardTitle>Thông tin đăng nhập</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Tên đăng nhập"
                    placeholder="VD: nguyen_van_a"
                    value={formData.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    error={errors.username}
                    required
                    disabled={isEdit}
                  />
                  <Select
                    label="Trạng thái"
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    options={[
                      { value: 'active', label: 'Hoạt động' },
                      { value: 'inactive', label: 'Vô hiệu hóa' },
                    ]}
                    required
                  />
                </div>

                {!isEdit ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Input
                        label="Mật khẩu"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Nhập mật khẩu"
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        error={errors.password}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        label="Xác nhận mật khẩu"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Nhập lại mật khẩu"
                        value={formData.confirmPassword}
                        onChange={(e) => handleChange('confirmPassword', e.target.value)}
                        error={errors.confirmPassword}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      💡 Để thay đổi mật khẩu, vui lòng sử dụng chức năng "Đặt lại mật khẩu" riêng
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Thông tin cá nhân</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Họ và tên"
                  placeholder="VD: Nguyễn Văn A"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  error={errors.name}
                  required
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    placeholder="VD: nguyen.van.a@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    error={errors.email}
                    required
                  />
                  <Input
                    label="Số điện thoại"
                    placeholder="VD: 0901234567"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    error={errors.phone}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Phân quyền</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Vai trò <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {roles.map((role) => (
                      <button
                        key={role.value}
                        type="button"
                        onClick={() => {
                          handleChange('role', role.value);
                          if (!requiresBranch(role.value)) {
                            handleChange('branchId', '');
                          }
                        }}
                        className={`p-4 border rounded-lg text-left transition-colors ${
                          formData.role === role.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{role.label}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {role.description}
                            </p>
                          </div>
                          {formData.role === role.value && (
                            <Badge variant="success">Đã chọn</Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  {errors.role && <p className="text-sm text-destructive mt-2">{errors.role}</p>}
                </div>

                {selectedRole && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm font-medium mb-2">Vai trò đã chọn:</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="info">{selectedRole.label}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {selectedRole.description}
                      </span>
                    </div>
                  </div>
                )}

                {requiresBranch(formData.role) && (
                  <Select
                    label="Chi nhánh"
                    value={formData.branchId}
                    onChange={(e) => handleChange('branchId', e.target.value)}
                    options={branches.map((b) => ({ value: b.id, label: b.name }))}
                    error={errors.branchId}
                    required
                  />
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Hủy
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                {isEdit ? 'Cập nhật' : 'Tạo tài khoản'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
