import { NavLink } from 'react-router';
import {
  LayoutDashboard,
  Pill,
  Tag,
  Building,
  Building2,
  ShoppingCart,
  Package,
  PackageCheck,
  ArrowLeftRight,
  PackageOpen,
  CreditCard,
  FileText,
  Receipt,
  Users,
  BarChart3,
  Percent,
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

interface MenuGroup {
  groupName?: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    items: [
      {
        label: 'Tổng quan',
        icon: LayoutDashboard,
        path: '/dashboard',
      },
    ],
  },
  {
    groupName: 'Sản phẩm & Đối tác',
    items: [
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
    ],
  },
  {
    groupName: 'Giao dịch kho',
    items: [
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
        label: 'Kiểm kho',
        icon: PackageCheck,
        path: '/inventory/checks',
        permissions: ['inventory.stocktake', 'inventory.adjust'],
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
    ],
  },
  {
    groupName: 'Bán hàng & Khách hàng',
    items: [
      {
        label: 'Bán hàng (POS)',
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
        label: 'Khuyến mãi',
        icon: Percent,
        path: '/promotions',
        permissions: ['promotion.view'],
      },
    ],
  },
  {
    groupName: 'Hệ thống & Báo cáo',
    items: [
      {
        label: 'Báo cáo doanh thu',
        icon: BarChart3,
        path: '/reports',
        permissions: ['report.view_branch', 'report.view_chain'],
      },
      {
        label: 'Quản lý chi nhánh',
        icon: Building,
        path: '/system/branches',
        permissions: ['branch.manage'],
      },
      {
        label: 'Tài khoản hệ thống',
        icon: Settings,
        path: '/system',
        permissions: ['user.manage', 'role.manage'],
      },
      {
        label: 'Nhật ký hoạt động',
        icon: FileSpreadsheet,
        path: '/audit',
        permissions: ['audit.view'],
      },
    ],
  },
];

export function Sidebar() {
  const { user, logout, hasAnyPermission } = useAuth();

  const visibleGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.permissions) return true;
        return hasAnyPermission(item.permissions);
      }),
    }))
    .filter((group) => group.items.length > 0);

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

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {visibleGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-1.5">
            {group.groupName && (
              <h2 className="px-3 text-xs font-semibold text-sidebar-foreground/45 uppercase tracking-wider">
                {group.groupName}
              </h2>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      )
                    }
                  >
                    <Icon className="h-4.5 w-4.5" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
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
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors text-sm font-medium"
        >
          <LogOut className="h-5 w-5" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}

