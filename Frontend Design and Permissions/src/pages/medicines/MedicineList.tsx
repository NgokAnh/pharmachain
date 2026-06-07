import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from '../../components/ui/Table';
import { Card } from '../../components/ui/Card';
import { Plus, Search, Eye, Edit } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Medicine } from '../../types';
import { apiUrl } from '../../config/api';

const mockMedicines: Medicine[] = [
  {
    id: 'med-1',
    code: 'MED0001',
    registrationNumber: 'VD-12345-24',
    name: 'Paracetamol Hapacol 500mg',
    category: 'Thuoc ha sot, giam dau',
    activeIngredient: 'Paracetamol',
    strength: '500mg',
    dosageForm: 'Vien nen',
    packagingSpec: '10 vi x 10 vien',
    unit: 'vien',
    unitConversionNote: '1 hop = 10 vi = 100 vien',
    barcode: '8934567000018',
    manufacturer: 'Duoc Hau Giang',
    countryOfOrigin: 'Viet Nam',
    description: 'Giam dau, ha sot nhanh.',
    status: 'active',
    saleCategory: 'OTC',
    sellPrice: 12,
    defaultCostPrice: 8,
    isPrescriptionRequired: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'med-2',
    code: 'MED0002',
    registrationNumber: 'VD-82763-23',
    name: 'Amoxicillin 500mg Imexpharm',
    category: 'Thuoc khang sinh',
    activeIngredient: 'Amoxicillin',
    strength: '500mg',
    dosageForm: 'Vien nang',
    packagingSpec: '10 vi x 10 vien',
    unit: 'vien',
    unitConversionNote: '1 hop = 10 vi = 100 vien',
    barcode: '8934567000025',
    manufacturer: 'Imexpharm',
    countryOfOrigin: 'Viet Nam',
    description: 'Khang sinh ke don.',
    status: 'active',
    saleCategory: 'PRESCRIPTION',
    sellPrice: 150,
    defaultCostPrice: 110,
    isPrescriptionRequired: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'med-3',
    code: 'MED0003',
    registrationNumber: 'QLSP-55671-22',
    name: 'Insulin Glargine Solostar',
    category: 'Thuoc noi tiet',
    activeIngredient: 'Insulin glargine',
    strength: '100IU/mL',
    dosageForm: 'But tien nap',
    packagingSpec: 'Hop 5 but x 3mL',
    unit: 'but',
    unitConversionNote: '1 hop = 5 but',
    barcode: '8934567000032',
    manufacturer: 'Sanofi',
    countryOfOrigin: 'France',
    description: 'Thuoc lanh 2-8C.',
    status: 'active',
    saleCategory: 'PRESCRIPTION',
    sellPrice: 420,
    defaultCostPrice: 310,
    isPrescriptionRequired: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'med-4',
    code: 'MED0004',
    registrationNumber: 'KSDB-0045-21',
    name: 'Diazepam 5mg',
    category: 'Huong than',
    activeIngredient: 'Diazepam',
    strength: '5mg',
    dosageForm: 'Vien nen',
    packagingSpec: '10 vi x 10 vien',
    unit: 'vien',
    unitConversionNote: '1 hop = 10 vi = 100 vien',
    barcode: '8934567000049',
    manufacturer: 'Mekophar',
    countryOfOrigin: 'Viet Nam',
    description: 'Thuoc kiem soat dac biet.',
    status: 'active',
    saleCategory: 'PRESCRIPTION',
    sellPrice: 65,
    defaultCostPrice: 40,
    isPrescriptionRequired: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'med-5',
    code: 'MED0005',
    registrationNumber: 'TPCN-0088-25',
    name: 'Nuoc muoi sinh ly 0.9%',
    category: 'Hang cham soc khong phai thuoc',
    activeIngredient: 'Sodium chloride',
    strength: '0.9%',
    dosageForm: 'Dung dich',
    packagingSpec: 'Chai 500mL',
    unit: 'chai',
    unitConversionNote: '1 thung = 24 chai',
    barcode: '8934567000056',
    manufacturer: 'Bidiphar',
    countryOfOrigin: 'Viet Nam',
    description: 'Hang khong phai thuoc.',
    status: 'inactive',
    saleCategory: 'NON_DRUG',
    sellPrice: 18,
    defaultCostPrice: 9,
    isPrescriptionRequired: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const saleCategoryLabel: Record<Medicine['saleCategory'], string> = {
  PRESCRIPTION: 'Thuốc kê đơn',
  OTC: 'Không kê đơn',
  NON_DRUG: 'Không phải thuốc',
};

export function MedicineList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('medicine.create');
  const canUpdate = hasPermission('medicine.update');

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        const token = localStorage.getItem('pharmacy_token');
        const response = await fetch(apiUrl('/medicines'), {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Không thể tải danh sách thuốc');
        }
        const data = await response.json();
        setMedicines(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMedicines();
  }, []);

  const filtered = medicines.filter((med) => {
    const matchesSearch =
      search === '' ||
      med.name.toLowerCase().includes(search.toLowerCase()) ||
      med.code.toLowerCase().includes(search.toLowerCase()) ||
      (med.barcode || '').includes(search) ||
      med.activeIngredient.toLowerCase().includes(search.toLowerCase()) ||
      (med.registrationNumber || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || med.saleCategory === category;
    const matchesStatus = status === 'all' || med.status === status;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / size);
  const paginatedData = filtered.slice((page - 1) * size, page * size);

  if (loading) {
    return (
      <div>
        <Header title="Danh mục thuốc" subtitle="Quản lý master data thuốc và ràng buộc bán hàng" />
        <div className="p-6 flex items-center justify-center">
          <div className="text-muted-foreground animate-pulse">Đang tải danh mục thuốc từ cơ sở dữ liệu...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Danh mục thuốc"
        subtitle="Quản lý master data thuốc và ràng buộc bán hàng"
        actions={
          canCreate && (
            <Button onClick={() => navigate('/medicines/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm thuốc
            </Button>
          )
        }
      />

      <div className="p-6">
        <Card>
          <div className="p-4 border-b border-border">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm theo SKU, tên biệt dược, số đăng ký, hoạt chất..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'Tất cả phân loại bán' },
                  { value: 'OTC', label: 'Không kê đơn' },
                  { value: 'PRESCRIPTION', label: 'Thuốc kê đơn' },
                ]}
                className="w-52"
              />
              <Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                options={[
                  { value: 'all', label: 'Tất cả trạng thái' },
                  { value: 'active', label: 'Đang bán' },
                  { value: 'inactive', label: 'Ngừng bán' },
                ]}
                className="w-40"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU / Số ĐK</TableHead>
                <TableHead>Tên biệt dược</TableHead>
                <TableHead>Nhóm thuốc</TableHead>
                <TableHead>Hoạt chất</TableHead>
                <TableHead>Dạng bào chế</TableHead>
                <TableHead>Phân loại bán</TableHead>
                <TableHead>Quy cách</TableHead>
                <TableHead>Giá bán</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((medicine) => (
                <TableRow key={medicine.id}>
                  <TableCell>
                    <div className="font-mono text-sm">{medicine.code}</div>
                    <div className="text-xs text-muted-foreground">{medicine.registrationNumber}</div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{medicine.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {medicine.manufacturer} • {medicine.countryOfOrigin}
                      </p>
                      {medicine.supplierName && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                          NCC: {medicine.supplierName}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-medium text-xs bg-muted/20">
                      {medicine.category || 'Khác'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div>{medicine.activeIngredient}</div>
                      <div className="text-xs text-muted-foreground">{medicine.strength}</div>
                    </div>
                  </TableCell>
                  <TableCell>{medicine.dosageForm}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="info">{saleCategoryLabel[medicine.saleCategory]}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{medicine.packagingSpec}</div>
                    <div className="text-xs text-muted-foreground">{medicine.unitConversionNote}</div>
                  </TableCell>
                  <TableCell className="font-semibold">${medicine.sellPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/medicines/${medicine.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/medicines/${medicine.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <TablePagination
            page={page}
            size={size}
            totalItems={totalItems}
            totalPages={totalPages}
            onPageChange={setPage}
            onSizeChange={(newSize) => {
              setSize(newSize);
              setPage(1);
            }}
          />
        </Card>
      </div>
    </div>
  );
}
