import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

// Mock data - giống với MedicineList
const mockMedicines = Array.from({ length: 45 }, (_, i) => ({
  id: `med-${i + 1}`,
  code: `MED${String(i + 1).padStart(4, '0')}`,
  name: ['Paracetamol', 'Amoxicillin', 'Ibuprofen', 'Vitamin C', 'Aspirin'][i % 5] + ` ${500 + i * 10}mg`,
  activeIngredient: ['Acetaminophen', 'Amoxicillin', 'Ibuprofen', 'Ascorbic Acid', 'Aspirin'][i % 5],
  category: ['Analgesic', 'Antibiotic', 'NSAID', 'Vitamin', 'Antiplatelet'][i % 5],
  manufacturer: ['PharmaCo', 'MediLabs', 'HealthCorp', 'VitaPlus', 'WellMed'][i % 5],
  isPrescriptionRequired: i % 3 === 0,
  unit: 'tablet',
  barcode: `893603587${String(1000 + i).padStart(4, '0')}`,
  sellPrice: 10 + i * 2,
  status: i % 7 === 0 ? 'inactive' : 'active',
  description: `Mô tả cho ${['Paracetamol', 'Amoxicillin', 'Ibuprofen', 'Vitamin C', 'Aspirin'][i % 5]}`,
}));

export function MedicineForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    // Thông tin danh mục
    code: '',
    name: '',
    category: '',
    activeIngredient: '',
    unit: '',
    barcode: '',
    manufacturer: '',
    description: '',
    status: 'active',

    // Thông tin bán hàng
    sellPrice: '',
    isPrescriptionRequired: 'false',
  });

  const [loading, setLoading] = useState(false);

  // Load dữ liệu khi edit
  useEffect(() => {
    if (isEdit && id) {
      setLoading(true);
      // Giả lập API call
      setTimeout(() => {
        const medicine = mockMedicines.find((m) => m.id === id);
        if (medicine) {
          setFormData({
            code: medicine.code,
            name: medicine.name,
            category: medicine.category,
            activeIngredient: medicine.activeIngredient,
            unit: medicine.unit,
            barcode: medicine.barcode,
            manufacturer: medicine.manufacturer,
            description: medicine.description || '',
            status: medicine.status,
            sellPrice: medicine.sellPrice.toString(),
            isPrescriptionRequired: medicine.isPrescriptionRequired.toString(),
          });
        } else {
          toast.error('Không tìm thấy thuốc');
          navigate('/medicines');
        }
        setLoading(false);
      }, 500);
    }
  }, [isEdit, id, navigate]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!formData.code || !formData.name || !formData.category) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (!formData.sellPrice || parseFloat(formData.sellPrice) <= 0) {
      toast.error('Giá bán phải lớn hơn 0');
      return;
    }

    // Simulate save
    toast.success(isEdit ? 'Cập nhật thuốc thành công!' : 'Thêm thuốc mới thành công!');
    navigate('/medicines');
  };

  if (loading) {
    return (
      <div>
        <Header
          title={isEdit ? 'Sửa thông tin thuốc' : 'Thêm thuốc mới'}
          subtitle={isEdit ? 'Đang tải dữ liệu...' : 'Thêm thuốc vào danh mục'}
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
        title={isEdit ? 'Sửa thông tin thuốc' : 'Thêm thuốc mới'}
        subtitle={isEdit ? `Cập nhật: ${formData.name}` : 'Thêm thuốc vào danh mục'}
        actions={
          <Button variant="outline" onClick={() => navigate('/medicines')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
        }
      />

      <div className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Thông tin danh mục */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin danh mục</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Mã thuốc *"
                    value={formData.code}
                    onChange={(e) => handleChange('code', e.target.value)}
                    placeholder="VD: MED0001"
                    required
                    disabled={isEdit}
                  />

                  <Input
                    label="Barcode"
                    value={formData.barcode}
                    onChange={(e) => handleChange('barcode', e.target.value)}
                    placeholder="VD: 8936035871234"
                  />

                  <div className="md:col-span-2">
                    <Input
                      label="Tên thuốc *"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="VD: Paracetamol 500mg"
                      required
                    />
                  </div>

                  <Input
                    label="Nhóm thuốc *"
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    placeholder="VD: Analgesic, Antibiotic..."
                    required
                  />

                  <Input
                    label="Hoạt chất *"
                    value={formData.activeIngredient}
                    onChange={(e) => handleChange('activeIngredient', e.target.value)}
                    placeholder="VD: Acetaminophen"
                    required
                  />

                  <Input
                    label="Đơn vị tính *"
                    value={formData.unit}
                    onChange={(e) => handleChange('unit', e.target.value)}
                    placeholder="VD: tablet, bottle, box..."
                    required
                  />

                  <Input
                    label="Nhà sản xuất"
                    value={formData.manufacturer}
                    onChange={(e) => handleChange('manufacturer', e.target.value)}
                    placeholder="VD: PharmaCo Ltd."
                  />

                  <div className="md:col-span-2">
                    <label className="block text-sm mb-1.5 text-foreground">Mô tả</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      placeholder="Mô tả chi tiết về thuốc..."
                      className="w-full min-h-20 px-3 py-2 rounded-lg border border-border bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <Select
                    label="Trạng thái"
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                    options={[
                      { value: 'active', label: 'Đang kinh doanh' },
                      { value: 'inactive', label: 'Ngừng kinh doanh' },
                    ]}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Thông tin bán hàng */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin bán hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Giá bán (USD) *"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.sellPrice}
                    onChange={(e) => handleChange('sellPrice', e.target.value)}
                    placeholder="VD: 12.50"
                    required
                  />

                  <Select
                    label="Loại thuốc"
                    value={formData.isPrescriptionRequired}
                    onChange={(e) => handleChange('isPrescriptionRequired', e.target.value)}
                    options={[
                      { value: 'false', label: 'Thuốc không kê đơn (OTC)' },
                      { value: 'true', label: 'Thuốc kê đơn (Rx)' },
                    ]}
                  />
                </div>

                {formData.isPrescriptionRequired === 'true' && (
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Lưu ý:</strong> Đây là thuốc kê đơn. Khi bán, hệ thống sẽ yêu cầu
                      đơn thuốc hợp lệ và lưu tham chiếu đến đơn thuốc/ảnh toa theo quy định.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/medicines')}
              >
                Hủy
              </Button>
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                {isEdit ? 'Cập nhật' : 'Thêm thuốc'}
              </Button>
            </div>
          </div>
        </form>

        {isEdit && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Lưu ý khi chỉnh sửa</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  Thông tin tồn kho theo lô không được chỉnh sửa tại đây. Vui lòng sử dụng chức
                  năng Nhập hàng hoặc Điều chỉnh kho.
                </li>
                <li>
                  Lịch sử nhập/xuất/chuyển kho là dữ liệu lịch sử, không thể chỉnh sửa hoặc xóa.
                </li>
                <li>
                  Thay đổi giá bán sẽ áp dụng cho các đơn hàng mới, không ảnh hưởng đến đơn hàng
                  đã tạo.
                </li>
                <li>
                  Nếu thay đổi từ "Không kê đơn" sang "Kê đơn", các giao dịch bán sau này sẽ yêu
                  cầu đơn thuốc.
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
