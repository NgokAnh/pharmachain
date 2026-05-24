import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Header } from '../../components/layout/Header';
import { Input } from '../../components/ui/Input';
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
import { Search, Eye } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Customer } from '../../types';

const mockCustomers: Customer[] = Array.from({ length: 35 }, (_, i) => ({
  id: `cust-${i + 1}`,
  code: `CUS${String(i + 1).padStart(4, '0')}`,
  name: ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson'][i % 5] + ` ${i}`,
  phone: `+1-555-${String(1000 + i).padStart(4, '0')}`,
  email: `customer${i}@email.com`,
  membershipTier: ['bronze', 'silver', 'gold', 'platinum'][i % 4] as any,
  points: Math.floor(Math.random() * 1000),
  joinDate: new Date(2024, i % 12, (i % 28) + 1).toISOString().split('T')[0],
}));

export function CustomerList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');

  const filtered = mockCustomers.filter(
    (c) =>
      search === '' ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  );

  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / size);
  const paginatedData = filtered.slice((page - 1) * size, page * size);

  const getTierColor = (tier: string) => {
    const colors = {
      bronze: 'default',
      silver: 'info',
      gold: 'warning',
      platinum: 'success',
    };
    return colors[tier as keyof typeof colors] || 'default';
  };

  return (
    <div>
      <Header title="Khách hàng" subtitle="Quản lý khách hàng và chương trình khách hàng thân thiết" />

      <div className="p-6">
        <Card>
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên, số điện thoại hoặc mã khách hàng..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã KH</TableHead>
                <TableHead>Tên</TableHead>
                <TableHead>Số điện thoại</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Hạng thành viên</TableHead>
                <TableHead>Điểm</TableHead>
                <TableHead>Ngày tham gia</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-mono text-sm">{customer.code}</TableCell>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                  <TableCell>
                    <Badge variant={getTierColor(customer.membershipTier) as any}>
                      {customer.membershipTier.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{customer.points}</TableCell>
                  <TableCell>{customer.joinDate}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/customers/${customer.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
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
