import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const saleCategoryOptions = [
  { value: 'OTC', label: 'Thuốc không kê đơn' },
  { value: 'PRESCRIPTION', label: 'Thuốc kê đơn' },
];

const yesNoOptions = [
  { value: 'true', label: 'Có' },
  { value: 'false', label: 'Không' },
];

const unitOptions = [
  { value: 'vien', label: 'Viên' },
  { value: 'vi', label: 'Vỉ' },
  { value: 'hop', label: 'Hộp' },
  { value: 'chai', label: 'Chai' },
  { value: 'lo', label: 'Lọ' },
  { value: 'tuyp', label: 'Tuýp' },
  { value: 'thung', label: 'Thùng' },
  { value: 'ong', label: 'Ống' },
  { value: 'goi', label: 'Gói' },
  { value: 'but', label: 'Bút' },
];

const statusOptions = [
  { value: 'active', label: 'Đang kinh doanh' },
  { value: 'inactive', label: 'Ngừng kinh doanh' },
];

const storagePresetOptions = [
  { value: 'AMBIENT,KEEP_DRY', label: 'Nhiệt độ thường, chống ẩm' },
  { value: 'AMBIENT,PROTECT_FROM_LIGHT', label: 'Nhiệt độ thường, tránh sáng' },
  { value: 'COOL,KEEP_DRY', label: 'Bảo quản mát, chống ẩm' },
  { value: 'COLD,PROTECT_FROM_LIGHT', label: 'Bảo quản lạnh, tránh sáng' },
];

function getUnitLabel(unitValue: string) {
  return unitOptions.find((option) => option.value === unitValue)?.label || unitValue;
}

function buildPackagingSpec(formData: {
  packageQuantity: string;
  packageUnit: string;
}) {
  if (!formData.packageQuantity || !formData.packageUnit) {
    return '';
  }

  return `${formData.packageQuantity} ${getUnitLabel(formData.packageUnit)}`;
}

function buildUnitConversionNote(formData: {
  packageQuantity: string;
  packageUnit: string;
  baseUnitQuantity: string;
  unit: string;
}) {
  if (!formData.packageQuantity || !formData.packageUnit || !formData.baseUnitQuantity || !formData.unit) {
    return '';
  }

  return `${formData.packageQuantity} ${getUnitLabel(formData.packageUnit)} = ${formData.baseUnitQuantity} ${getUnitLabel(formData.unit)}`;
}

const mockMedicine = {
  code: 'MED0002',
  registrationNumber: 'VD-82763-23',
  name: 'Amoxicillin 500mg Imexpharm',
  category: 'Thuoc khang sinh',
  activeIngredient: 'Amoxicillin',
  strength: '500mg',
  dosageForm: 'Vien nang',
  packagingSpec: '10 Vỉ',
  unit: 'vien',
  unitConversionNote: '10 Vỉ = 100 Viên',
  packageQuantity: '10',
  packageUnit: 'vi',
  baseUnitQuantity: '100',
  barcode: '8934567000025',
  manufacturer: 'Imexpharm',
  countryOfOrigin: 'Viet Nam',
  description: 'Khang sinh ke don.',
  status: 'active',
  saleCategory: 'PRESCRIPTION',
  sellPrice: '150',
  defaultCostPrice: '110',
  isPrescriptionRequired: 'true',
};

export function MedicineForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    code: '',
    registrationNumber: '',
    name: '',
    category: '',
    activeIngredient: '',
    strength: '',
    dosageForm: '',
    packagingSpec: '',
    unit: 'vien',
    unitConversionNote: '',
    packageQuantity: '',
    packageUnit: '',
    baseUnitQuantity: '',
    barcode: '',
    manufacturer: '',
    countryOfOrigin: '',
    description: '',
    status: 'active',
    saleCategory: 'OTC',
    sellPrice: '',
    defaultCostPrice: '',
    isPrescriptionRequired: 'false',
    supplierId: '',
  });

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; code: string; name: string; status: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; code: string; name: string }[]>([]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const token = localStorage.getItem('pharmacy_token');
        const response = await fetch('http://localhost:3000/api/categories', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setCategories(data);
          }
        }
      } catch (err) {
        console.error('Error loading categories:', err);
      }
    };

    const loadSuppliers = async () => {
      try {
        const token = localStorage.getItem('pharmacy_token');
        const response = await fetch('http://localhost:3000/api/suppliers', {
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

    loadCategories();
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (isEdit) {
      const loadMedicine = async () => {
        setLoading(true);
        try {
          const token = localStorage.getItem('pharmacy_token');
          const response = await fetch(`http://localhost:3000/api/medicines/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.ok) throw new Error('Không thể tải thông tin thuốc');
          const data = await response.json();
          
          setFormData({
            code: data.code,
            registrationNumber: data.registrationNumber || '',
            name: data.name,
            category: data.category || '',
            activeIngredient: data.activeIngredient,
            strength: data.strength,
            dosageForm: data.dosageForm,
            packagingSpec: data.packagingSpec || '',
            unit: data.unit,
            unitConversionNote: data.unitConversionNote || '',
            packageQuantity: data.unitConversions?.[0] ? '1' : '',
            packageUnit: data.unitConversions?.[0]?.fromUnit || '',
            baseUnitQuantity: data.unitConversions?.[0] ? String(data.unitConversions[0].conversionRate) : '',
            barcode: data.barcode || '',
            manufacturer: data.manufacturer,
            countryOfOrigin: data.countryOfOrigin,
            description: data.description || '',
            status: data.status,
            saleCategory: data.saleCategory,
            sellPrice: String(data.sellPrice),
            defaultCostPrice: data.defaultCostPrice ? String(data.defaultCostPrice) : '',
            isPrescriptionRequired: String(data.isPrescriptionRequired),
            supplierId: data.supplierId || '',
          });
        } catch (err) {
          console.error(err);
          toast.error('Lỗi khi tải thông tin chi tiết thuốc.');
        } finally {
          setLoading(false);
        }
      };
      loadMedicine();
    }
  }, [id, isEdit]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalCategory = isCustomCategory ? customCategory : formData.category;

    const normalizedFormData = {
      ...formData,
      category: finalCategory || 'Khác',
      packagingSpec: buildPackagingSpec(formData),
      unitConversionNote: buildUnitConversionNote(formData),
    };

    const requiredFields = [
      normalizedFormData.name,
      normalizedFormData.activeIngredient,
      normalizedFormData.strength,
      normalizedFormData.dosageForm,
      normalizedFormData.packagingSpec,
      normalizedFormData.unit,
      normalizedFormData.unitConversionNote,
      normalizedFormData.manufacturer,
      normalizedFormData.countryOfOrigin,
      normalizedFormData.sellPrice,
    ];

    if (requiredFields.some((field) => !field)) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc.');
      return;
    }

    if (Number(formData.sellPrice) <= 0) {
      toast.error('Giá bán phải lớn hơn 0.');
      return;
    }

    const saveMedicine = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('pharmacy_token');
        const url = isEdit ? `http://localhost:3000/api/medicines/${id}` : `http://localhost:3000/api/medicines`;
        const method = isEdit ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(normalizedFormData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Lưu thông tin thuốc thất bại');
        }

        toast.success(isEdit ? 'Cập nhật thông tin thuốc thành công!' : 'Thêm thuốc mới vào danh mục thành công!');
        navigate('/medicines');
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Lỗi kết nối máy chủ API!');
      } finally {
        setLoading(false);
      }
    };
    saveMedicine();
  };

  if (loading) {
    return (
      <div>
        <Header
          title={isEdit ? 'Sửa thông tin thuốc' : 'Thêm thuốc mới'}
          subtitle="Đang tải dữ liệu thuốc..."
        />
        <div className="p-6 flex items-center justify-center">
          <div className="text-muted-foreground">Đang tải dữ liệu...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={isEdit ? 'Sửa thông tin thuốc' : 'Thêm thuốc mới'}
        subtitle={
          isEdit
            ? `Cập nhật hồ sơ thuốc: ${formData.name}`
            : 'Khai báo đầy đủ danh mục thuốc, phân loại bán, giá và ràng buộc pháp lý'
        }
        actions={
          <Button variant="outline" onClick={() => navigate('/medicines')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
        }
      />

      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin sản phẩm thuốc</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Khai báo thông tin nhận diện của thuốc: mã SKU, số đăng ký, tên biệt dược, hoạt chất,
                hàm lượng, dạng bào chế, quy cách đóng gói và nhà sản xuất.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Mã thuốc / SKU"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value)}
                  placeholder="Tự động tạo nếu bỏ trống (Ví dụ: MED0006)"
                  disabled={isEdit}
                />
                <Input
                  label="Số đăng ký"
                  value={formData.registrationNumber}
                  onChange={(e) => handleChange('registrationNumber', e.target.value)}
                  placeholder="Ví dụ: VD-12345-24"
                />
                <div className="md:col-span-2">
                  <Input
                    label="Tên biệt dược *"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Ví dụ: Paracetamol Hapacol 500mg"
                    required
                  />
                </div>
                <Input
                  label="Hoạt chất *"
                  value={formData.activeIngredient}
                  onChange={(e) => handleChange('activeIngredient', e.target.value)}
                  placeholder="Ví dụ: Paracetamol"
                  required
                />
                <Input
                  label="Hàm lượng *"
                  value={formData.strength}
                  onChange={(e) => handleChange('strength', e.target.value)}
                  placeholder="Ví dụ: 500mg"
                  required
                />
                <Input
                  label="Dạng bào chế *"
                  value={formData.dosageForm}
                  onChange={(e) => handleChange('dosageForm', e.target.value)}
                  placeholder="Ví dụ: Viên nén, viên nang, dung dịch"
                  required
                />
                <Input
                  label="Quy cách đóng gói *"
                  value={buildPackagingSpec(formData)}
                  placeholder="Được tạo tự động từ các ô bên dưới"
                  readOnly
                  required
                />
                <Input
                  label="Mã vạch / Barcode"
                  value={formData.barcode}
                  onChange={(e) => handleChange('barcode', e.target.value)}
                  placeholder="Ví dụ: 8934567000025"
                />
                <div className="flex flex-col gap-1">
                  <Select
                    label="Nhóm thuốc *"
                    value={isCustomCategory ? 'CUSTOM' : formData.category}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'CUSTOM') {
                        setIsCustomCategory(true);
                        handleChange('category', customCategory);
                      } else {
                        setIsCustomCategory(false);
                        handleChange('category', val);
                      }
                    }}
                    options={[
                      { value: '', label: 'Chọn nhóm thuốc...' },
                      ...categories
                        .filter(cat => cat.status === 'active' || cat.name === formData.category)
                        .map(cat => ({ value: cat.name, label: cat.name })),
                      { value: 'CUSTOM', label: 'Khác (Nhập nhóm mới...)' }
                    ]}
                  />
                  {isCustomCategory && (
                    <Input
                      label="Tên nhóm thuốc mới *"
                      value={customCategory}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomCategory(val);
                        handleChange('category', val);
                      }}
                      placeholder="Nhập tên nhóm thuốc mới..."
                      required
                    />
                  )}
                </div>
                <Input
                  label="Nhà sản xuất *"
                  value={formData.manufacturer}
                  onChange={(e) => handleChange('manufacturer', e.target.value)}
                  placeholder="Ví dụ: Imexpharm"
                  required
                />
                <Input
                  label="Nước sản xuất *"
                  value={formData.countryOfOrigin}
                  onChange={(e) => handleChange('countryOfOrigin', e.target.value)}
                  placeholder="Ví dụ: Việt Nam"
                  required
                />
                <Select
                  label="Nhà cung cấp"
                  value={formData.supplierId}
                  onChange={(e) => handleChange('supplierId', e.target.value)}
                  options={[
                    { value: '', label: 'Chọn nhà cung cấp...' },
                    ...suppliers.map((s) => ({ value: s.id, label: s.name })),
                  ]}
                />
                <Select
                  label="Đơn vị tính cơ sở *"
                  value={formData.unit}
                  onChange={(e) => handleChange('unit', e.target.value)}
                  options={unitOptions}
                />
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1.5 text-foreground">Tỷ lệ quy đổi *</label>
                  <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_48px_120px_1fr] gap-3 items-end">
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.packageQuantity}
                      onChange={(e) => handleChange('packageQuantity', e.target.value)}
                      placeholder="10"
                    />
                    <Select
                      value={formData.packageUnit}
                      onChange={(e) => handleChange('packageUnit', e.target.value)}
                      options={[
                        { value: '', label: 'Chọn đơn vị bao gói' },
                        ...unitOptions,
                      ]}
                    />
                    <div className="flex h-10 items-center justify-center rounded-lg border border-border bg-muted/40 text-sm font-medium">
                      =
                    </div>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={formData.baseUnitQuantity}
                      onChange={(e) => handleChange('baseUnitQuantity', e.target.value)}
                      placeholder="100"
                    />
                    <Input value={getUnitLabel(formData.unit)} readOnly />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ví dụ: <strong>10 vỉ = 100 viên</strong> hoặc <strong>1 thùng = 24 chai</strong>.
                  </p>
                </div>
                <div className="md:col-span-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  Hệ thống sẽ lưu:
                  {' '}
                  <strong>Quy cách đóng gói:</strong>
                  {' '}
                  {buildPackagingSpec(formData) || 'Chưa khai báo'}
                  {' | '}
                  <strong>Tỷ lệ quy đổi:</strong>
                  {' '}
                  {buildUnitConversionNote(formData) || 'Chưa khai báo'}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1.5 text-foreground">Mô tả ngắn</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Ghi chú thêm về công dụng, lưu ý bán hàng hoặc thông tin hỗ trợ dược sĩ."
                    className="w-full min-h-20 px-3 py-2 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Phân loại bán và bảo quản</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Xác định loại thuốc kê đơn hay không kê đơn để áp dụng quy trình bán hàng phù hợp.
              </p>
              <div className="grid grid-cols-1 gap-4">
                <Select
                  label="Loại thuốc (Phân loại bán) *"
                  value={formData.saleCategory}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      saleCategory: val,
                      isPrescriptionRequired: val === 'PRESCRIPTION' ? 'true' : 'false',
                      requiresConsultation: val === 'PRESCRIPTION' ? 'true' : 'false',
                    }));
                  }}
                  options={saleCategoryOptions}
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Giá bán và ràng buộc pháp lý</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Thiết lập giá vốn, giá bán mặc định và trạng thái kinh doanh của thuốc.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Giá vốn mặc định"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.defaultCostPrice}
                  onChange={(e) => handleChange('defaultCostPrice', e.target.value)}
                  placeholder="Ví dụ: 110"
                />
                <Input
                  label="Giá bán mặc định *"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.sellPrice}
                  onChange={(e) => handleChange('sellPrice', e.target.value)}
                  placeholder="Ví dụ: 150"
                  required
                />
                <Select
                  label="Trạng thái kinh doanh"
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  options={statusOptions}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/medicines')}>
              Hủy
            </Button>
            <Button type="submit">
              Lưu thông tin thuốc
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
