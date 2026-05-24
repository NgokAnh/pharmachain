import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, AuthContextType, Permission, UserRole } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role to Permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ROLE_ADMIN: [
    'medicine.view',
    'medicine.create',
    'medicine.update',
    'medicine.category.manage',
    'supplier.view',
    'supplier.create',
    'supplier.update',
    'purchasing.create',
    'purchasing.approve',
    'purchasing.receive',
    'inventory.view',
    'inventory.stocktake',
    'inventory.adjust',
    'inventory.batch.manage',
    'transfer.create',
    'transfer.approve',
    'transfer.ship',
    'transfer.receive',
    'sales.view',
    'sales.create',
    'sales.cancel',
    'prescription.verify',
    'customer.view',
    'customer.manage',
    'report.view_branch',
    'report.view_chain',
    'branch.manage',
    'user.manage',
    'role.manage',
    'audit.view',
  ],
  ROLE_CHAIN_MANAGER: [
    'medicine.view',
    'medicine.create',
    'medicine.update',
    'medicine.category.manage',
    'supplier.view',
    'supplier.create',
    'supplier.update',
    'purchasing.create',
    'purchasing.approve',
    'purchasing.receive',
    'inventory.view',
    'inventory.stocktake',
    'inventory.adjust',
    'inventory.batch.manage',
    'transfer.create',
    'transfer.approve',
    'sales.view',
    'sales.cancel',
    'customer.view',
    'customer.manage',
    'report.view_branch',
    'report.view_chain',
    'audit.view',
  ],
  ROLE_BRANCH_MANAGER: [
    'medicine.view',
    'supplier.view',
    'purchasing.create',
    'purchasing.receive',
    'inventory.view',
    'inventory.stocktake',
    'inventory.batch.manage',
    'transfer.create',
    'transfer.ship',
    'transfer.receive',
    'sales.view',
    'sales.create',
    'sales.cancel',
    'prescription.verify',
    'customer.view',
    'customer.manage',
    'report.view_branch',
  ],
  ROLE_WAREHOUSE_STAFF: [
    'medicine.view',
    'supplier.view',
    'purchasing.create',
    'purchasing.receive',
    'inventory.view',
    'inventory.stocktake',
    'inventory.batch.manage',
    'transfer.ship',
    'transfer.receive',
  ],
  ROLE_PHARMACIST: [
    'medicine.view',
    'inventory.view',
    'sales.view',
    'sales.create',
    'prescription.verify',
    'customer.view',
    'customer.manage',
  ],
};

// Mock users for demo
const MOCK_USERS: Record<string, { password: string; user: Omit<User, 'permissions'> }> = {
  admin: {
    password: 'admin123',
    user: {
      id: '1',
      username: 'admin',
      name: 'System Admin',
      email: 'admin@pharmacy.com',
      role: 'ROLE_ADMIN',
    },
  },
  chain_manager: {
    password: 'manager123',
    user: {
      id: '2',
      username: 'chain_manager',
      name: 'John Chain',
      email: 'john@pharmacy.com',
      role: 'ROLE_CHAIN_MANAGER',
    },
  },
  branch_manager: {
    password: 'branch123',
    user: {
      id: '3',
      username: 'branch_manager',
      name: 'Jane Branch',
      email: 'jane@pharmacy.com',
      role: 'ROLE_BRANCH_MANAGER',
      branchId: 'br-1',
      branchName: 'Chi nhánh Quận 1',
    },
  },
  branch_manager2: {
    password: 'branch123',
    user: {
      id: '6',
      username: 'branch_manager2',
      name: 'Nguyễn Văn B',
      email: 'nguyenb@pharmacy.com',
      role: 'ROLE_BRANCH_MANAGER',
      branchId: 'br-3',
      branchName: 'Chi nhánh Hai Bà Trưng',
    },
  },
  pharmacist: {
    password: 'pharm123',
    user: {
      id: '4',
      username: 'pharmacist',
      name: 'Mary Pharmacist',
      email: 'mary@pharmacy.com',
      role: 'ROLE_PHARMACIST',
      branchId: 'branch-1',
      branchName: 'Downtown Branch',
    },
  },
  warehouse: {
    password: 'warehouse123',
    user: {
      id: '5',
      username: 'warehouse',
      name: 'Bob Warehouse',
      email: 'bob@pharmacy.com',
      role: 'ROLE_WAREHOUSE_STAFF',
      branchId: 'br-1',
      branchName: 'Chi nhánh Quận 1',
    },
  },
  warehouse2: {
    password: 'warehouse123',
    user: {
      id: '7',
      username: 'warehouse2',
      name: 'Trần Văn Kho',
      email: 'trankho@pharmacy.com',
      role: 'ROLE_WAREHOUSE_STAFF',
      branchId: 'br-3',
      branchName: 'Chi nhánh Hai Bà Trưng',
    },
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('pharmacy_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (username: string, password: string, branchId?: string) => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Đăng nhập không thành công');
      }

      const data = await response.json();
      const userData: User = data.user;

      // Save token for authenticated requests
      localStorage.setItem('pharmacy_token', data.token);

      setUser(userData);
      localStorage.setItem('pharmacy_user', JSON.stringify(userData));
    } catch (err: any) {
      throw new Error(err.message || 'Lỗi kết nối đến máy chủ Backend');
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('pharmacy_user');
    localStorage.removeItem('pharmacy_token');
  }, []);

  const hasPermission = useCallback(
    (permission: Permission) => {
      return user?.permissions.includes(permission) ?? false;
    },
    [user]
  );

  const hasAnyPermission = useCallback(
    (permissions: Permission[]) => {
      return permissions.some((p) => user?.permissions.includes(p)) ?? false;
    },
    [user]
  );

  const value: AuthContextType = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    hasPermission,
    hasAnyPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
