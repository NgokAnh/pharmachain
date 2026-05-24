import { useState } from 'react';
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

// Mock data
const mockMedicines: Medicine[] = Array.from({ length: 45 }, (_, i) => ({
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
  createdAt: new Date(2024, i % 12, (i % 28) + 1).toISOString(),
  updatedAt: new Date(2024, i % 12, (i % 28) + 1).toISOString(),
}));

export function MedicineList() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('medicine.create');
  const canUpdate = hasPermission('medicine.update');

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');

  // Filter and paginate
  const filtered = mockMedicines.filter((med) => {
    const matchesSearch =
      search === '' ||
      med.name.toLowerCase().includes(search.toLowerCase()) ||
      med.code.toLowerCase().includes(search.toLowerCase()) ||
      med.barcode.includes(search) ||
      med.activeIngredient.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || med.category === category;
    const matchesStatus = status === 'all' || med.status === status;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / size);
  const startIdx = (page - 1) * size;
  const paginatedData = filtered.slice(startIdx, startIdx + size);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSizeChange = (newSize: number) => {
    setSize(newSize);
    setPage(1);
  };

  return (
    <div>
      <Header
        title="Danh mục thuốc"
        subtitle="Quản lý danh mục thuốc"
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
                    placeholder="Tìm theo tên, mã, barcode, hoạt chất..."
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
                  { value: 'all', label: 'Tất cả nhóm thuốc' },
                  { value: 'Analgesic', label: 'Thuốc giảm đau' },
                  { value: 'Antibiotic', label: 'Kháng sinh' },
                  { value: 'NSAID', label: 'Thuốc chống viêm' },
                  { value: 'Vitamin', label: 'Vitamin' },
                  { value: 'Antiplatelet', label: 'Chống kết tập tiểu cầu' },
                ]}
                className="w-48"
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
                <TableHead>Mã thuốc</TableHead>
                <TableHead>Tên thuốc</TableHead>
                <TableHead>Hoạt chất</TableHead>
                <TableHead>Nhóm thuốc</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Đơn vị</TableHead>
                <TableHead>Giá bán</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((medicine) => (
                <TableRow key={medicine.id}>
                  <TableCell className="font-mono text-sm">{medicine.code}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{medicine.name}</p>
                      {medicine.isPrescriptionRequired && (
                        <Badge variant="warning" className="mt-1">
                          Rx
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{medicine.activeIngredient}</TableCell>
                  <TableCell>
                    <Badge variant="info">{medicine.category}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{medicine.barcode}</TableCell>
                  <TableCell>{medicine.unit}</TableCell>
                  <TableCell className="font-semibold">${medicine.sellPrice.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={medicine.status === 'active' ? 'success' : 'default'}>
                      {medicine.status === 'active' ? 'Đang bán' : 'Ngừng bán'}
                    </Badge>
                  </TableCell>
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
            onPageChange={handlePageChange}
            onSizeChange={handleSizeChange}
          />
        </Card>
      </div>
    </div>
  );
}
