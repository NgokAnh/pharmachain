import { NavLink } from 'react-router';
import {
  LayoutDashboard,
  Pill,
  Tag,
  Building,
  Building2,
  ShoppingCart,
  Package,
  ArrowLeftRight,
  PackageOpen,
  CreditCard,
  FileText,
  Receipt,
  Users,
  BarChart3,
  Settings,
  FileSpreadsheet,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Permission } from '../../types';
import { clsx } from 'clsx';

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path: string;
  permissions?: Permission[];
}

const menuItems: MenuItem[] = [
  {
    label: 'Tổng quan',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    label: 'Danh mục thuốc',
    icon: Pill,
    path: '/medicines',
    permissions: ['medicine.view'],
  },
  {
    label: 'Nhóm thuốc',
    icon: Tag,
    path: '/medicines/categories',
    permissions: ['medicine.category.manage'],
  },
  {
    label: 'Nhà cung cấp',
    icon: Building2,
    path: '/suppliers',
    permissions: ['supplier.view'],
  },
  {
    label: 'Nhập hàng',
    icon: ShoppingCart,
    path: '/purchases',
    permissions: ['purchasing.create', 'purchasing.receive'],
  },
  {
    label: 'Tồn kho',
    icon: Package,
    path: '/inventory',
    permissions: ['inventory.view'],
  },
  {
    label: 'Chuyển kho',
    icon: ArrowLeftRight,
    path: '/transfers',
    permissions: ['transfer.create', 'transfer.approve'],
  },
  {
    label: 'Xuất nhập kho',
    icon: PackageOpen,
    path: '/warehouse',
    permissions: ['transfer.ship'],
  },
  {
    label: 'Bán hàng',
    icon: CreditCard,
    path: '/pos',
    permissions: ['sales.create'],
  },
  {
    label: 'Hóa đơn lẻ',
    icon: Receipt,
    path: '/invoices',
    permissions: ['sales.view'],
  },
  {
    label: 'Khách hàng',
    icon: Users,
    path: '/customers',
    permissions: ['customer.view'],
  },
  {
    label: 'Báo cáo',
    icon: BarChart3,
    path: '/reports',
    permissions: ['report.view_branch', 'report.view_chain'],
  },
  {
    label: 'Chi nhánh',
    icon: Building,
    path: '/system/branches',
    permissions: ['branch.manage'],
  },
  {
    label: 'Hệ thống',
    icon: Settings,
    path: '/system',
    permissions: ['user.manage', 'role.manage'],
  },
  {
    label: 'Nhật ký',
    icon: FileSpreadsheet,
    path: '/audit',
    permissions: ['audit.view'],
  },
];

export function Sidebar() {
  const { user, logout, hasAnyPermission } = useAuth();

  const visibleMenuItems = menuItems.filter((item) => {
    if (!item.permissions) return true;
    return hasAnyPermission(item.permissions);
  });

  return (
    <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-semibold text-sidebar-foreground">
          Hệ thống nhà thuốc
        </h1>
        {user?.branchName && (
          hasAnyPermission(['branch.manage']) ? (
            <NavLink
              to={`/system/branches?editName=${encodeURIComponent(user.branchName)}`}
              className="text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:underline mt-1 block font-medium"
            >
              {user.branchName}
            </NavLink>
          ) : (
            <p className="text-sm text-sidebar-foreground/60 mt-1">
              {user.branchName}
            </p>
          )
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )
              }
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium text-sidebar-foreground">
            {user?.name}
          </p>
          <p className="text-xs text-sidebar-foreground/60">{user?.email}</p>
          <p className="text-xs text-sidebar-foreground/60 mt-1">
            {user?.role.replace('ROLE_', '').replace(/_/g, ' ')}
          </p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}
