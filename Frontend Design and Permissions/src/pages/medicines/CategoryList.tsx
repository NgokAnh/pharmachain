import { useState, useEffect } from 'react';
import { Header } from '../../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TablePagination,
} from '../../components/ui/Table';
import { Plus, Search, Edit, Trash2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { apiUrl } from '../../config/api';

interface Category {
  id: string;
  code: string;
  name: string;
  description?: string;
  medicineCount: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    code: 'CAT001',
    name: 'Thuốc giảm đau - Hạ sốt',
    description: 'Nhóm thuốc giảm đau, hạ sốt, chống viêm',
    medicineCount: 45,
    status: 'active',
    createdAt: '2024-01-15',
  },
  {
    id: 'cat-2',
    code: 'CAT002',
    name: 'Kháng sinh',
    description: 'Nhóm thuốc kháng sinh các loại',
    medicineCount: 68,
    status: 'active',
    createdAt: '2024-01-15',
  },
  {
    id: 'cat-3',
    code: 'CAT003',
    name: 'Vitamin & Khoáng chất',
    description: 'Các loại vitamin và khoáng chất bổ sung',
    medicineCount: 92,
    status: 'active',
    createdAt: '2024-01-15',
  },
  {
    id: 'cat-4',
    code: 'CAT004',
    name: 'Thuốc tim mạch',
    description: 'Thuốc điều trị các bệnh về tim mạch',
    medicineCount: 34,
    status: 'active',
    createdAt: '2024-01-16',
  },
  {
    id: 'cat-5',
    code: 'CAT005',
    name: 'Thuốc tiêu hóa',
    description: 'Thuốc điều trị các bệnh về tiêu hóa',
    medicineCount: 56,
    status: 'active',
    createdAt: '2024-01-16',
  },
  {
    id: 'cat-6',
    code: 'CAT006',
    name: 'Thuốc hô hấp',
    description: 'Thuốc điều trị các bệnh về đường hô hấp',
    medicineCount: 41,
    status: 'active',
    createdAt: '2024-01-17',
  },
  {
    id: 'cat-7',
    code: 'CAT007',
    name: 'Thuốc da liễu',
    description: 'Thuốc điều trị các bệnh về da',
    medicineCount: 28,
    status: 'active',
    createdAt: '2024-01-17',
  },
  {
    id: 'cat-8',
    code: 'CAT008',
    name: 'Thuốc mắt - Tai - Mũi - Họng',
    description: 'Các loại thuốc chuyên khoa',
    medicineCount: 23,
    status: 'active',
    createdAt: '2024-01-18',
  },
];

export function CategoryList() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    status: 'active' as const,
  });

  const loadCategories = async () => {
    try {
      const token = localStorage.getItem('pharmacy_token');
      const response = await fetch(apiUrl('/categories'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Không thể tải danh sách nhóm thuốc');
      }
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error(err);
      toast.error('Lỗi khi tải danh sách nhóm thuốc từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filtered = categories.filter(
    (cat) =>
      search === '' ||
      cat.name.toLowerCase().includes(search.toLowerCase()) ||
      cat.code.toLowerCase().includes(search.toLowerCase())
  );

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / size);
  const paginatedData = filtered.slice((page - 1) * size, page * size);

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      code: category.code,
      name: category.name,
      description: category.description || '',
      status: category.status,
    });
    setShowForm(true);
  };

  const handleDelete = async (category: Category) => {
    if (category.medicineCount > 0) {
      toast.error(`Không thể xóa nhóm "${category.name}" vì đang có ${category.medicineCount} thuốc trực thuộc.`);
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('pharmacy_token');
      const response = await fetch(apiUrl(`/categories/${category.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Xóa nhóm thuốc thất bại');
      }

      toast.success(`Đã xóa nhóm thuốc "${category.name}"`);
      await loadCategories();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Lỗi kết nối máy chủ API!');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('pharmacy_token');
      const url = editingCategory
        ? apiUrl(`/categories/${editingCategory.id}`)
        : apiUrl('/categories');
      const method = editingCategory ? 'PUT' : 'POST';

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
        throw new Error(errorData.error || 'Thao tác lưu thất bại');
      }

      toast.success(editingCategory ? `Đã cập nhật nhóm thuốc "${formData.name}"` : `Đã tạo nhóm thuốc "${formData.name}"`);
      setShowForm(false);
      setEditingCategory(null);
      setFormData({ code: '', name: '', description: '', status: 'active' });
      await loadCategories();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Lỗi kết nối máy chủ API!');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({ code: '', name: '', description: '', status: 'active' });
  };

  const stats = {
    total: categories.length,
    active: categories.filter((c) => c.status === 'active').length,
    totalMedicines: categories.reduce((sum, c) => sum + c.medicineCount, 0),
  };

  if (loading) {
    return (
      <div>
        <Header title="Nhóm thuốc" subtitle="Quản lý phân loại thuốc" />
        <div className="p-6 flex items-center justify-center">
          <div className="text-muted-foreground animate-pulse">Đang tải danh sách nhóm thuốc thực tế...</div>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div>
        <Header
          title={editingCategory ? 'Sửa nhóm thuốc' : 'Thêm nhóm thuốc'}
          subtitle="Quản lý phân loại thuốc"
        />
        <div className="p-6">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Mã nhóm"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Tự động tạo nếu bỏ trống (VD: CAT001)"
                  />
                  <Input
                    label="Tên nhóm thuốc"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Thuốc giảm đau - Hạ sốt"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-2">Mô tả</label>
                  <textarea
                    className="w-full min-h-[100px] px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Nhập mô tả về nhóm thuốc..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Hủy
                  </Button>
                  <Button type="submit">
                    {editingCategory ? 'Cập nhật' : 'Tạo mới'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Nhóm thuốc"
        subtitle="Quản lý phân loại thuốc"
        actions={
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Thêm nhóm mới
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Tag className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng số nhóm</p>
                <h3 className="text-2xl font-semibold">{stats.total}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Tag className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                <h3 className="text-2xl font-semibold">{stats.active}</h3>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Tag className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tổng số thuốc</p>
                <h3 className="text-2xl font-semibold">{stats.totalMedicines}</h3>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Danh sách nhóm thuốc</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên hoặc mã nhóm..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10 w-80"
                />
              </div>
            </div>
          </CardHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã nhóm</TableHead>
                <TableHead>Tên nhóm</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead className="text-right">Số thuốc</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-mono text-sm">{category.code}</TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                    {category.description || '-'}
                  </TableCell>
                  <TableCell className="text-right">{category.medicineCount}</TableCell>
                  <TableCell>
                    <Badge variant={category.status === 'active' ? 'success' : 'default'}>
                      {category.status === 'active' ? 'Hoạt động' : 'Ngừng'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category)}
                        disabled={category.medicineCount > 0}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
            onSizeChange={(s) => {
              setSize(s);
              setPage(1);
            }}
          />
        </Card>
      </div>
    </div>
  );
}
