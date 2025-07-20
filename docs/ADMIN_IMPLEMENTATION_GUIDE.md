# Admin Panel Implementation Guide

## Quick Start Checklist

### 🚀 Phase 1: Project Setup (Week 1)
- [ ] **Initialize Next.js project with TypeScript**
  ```bash
  npx create-next-app@latest admin-panel --typescript --tailwind --eslint
  cd admin-panel
  ```

- [ ] **Install essential dependencies**
  ```bash
  npm install @tanstack/react-query zustand react-hook-form zod
  npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
  npm install lucide-react recharts date-fns
  npm install clsx tailwind-merge
  ```

- [ ] **Set up Shadcn/ui**
  ```bash
  npx shadcn@latest init
  npx shadcn@latest add button card table form input
  ```

- [ ] **Configure environment variables**
  ```env
  # .env.local
  NEXT_PUBLIC_API_URL=http://localhost:3001
  NEXT_PUBLIC_WS_URL=ws://localhost:3001
  NEXTAUTH_SECRET=your-secret-key
  NEXTAUTH_URL=http://localhost:3000
  ```

## 📋 Implementation Tasks by Priority

### 🔥 HIGH PRIORITY (Must Have)

#### 1. Authentication System
**Estimated Time: 3-4 days**

**Tasks:**
- [ ] Create login page with form validation
- [ ] Implement JWT token management
- [ ] Set up protected routes
- [ ] Create admin user management
- [ ] Add session persistence

**Key Components:**
```typescript
// pages/auth/login.tsx
// components/auth/LoginForm.tsx
// hooks/useAuth.ts
// services/authService.ts
// middleware/authMiddleware.ts
```

#### 2. Dashboard Overview
**Estimated Time: 4-5 days**

**Tasks:**
- [ ] Create dashboard layout
- [ ] Implement overview cards
- [ ] Add basic charts (user growth, revenue)
- [ ] Create quick actions panel
- [ ] Add real-time data fetching

**Key Components:**
```typescript
// pages/dashboard/index.tsx
// components/dashboard/OverviewCards.tsx
// components/dashboard/RevenueChart.tsx
// components/dashboard/QuickActions.tsx
// hooks/useDashboardData.ts
```

#### 3. User Management
**Estimated Time: 5-6 days**

**Tasks:**
- [ ] Create user listing page with pagination
- [ ] Implement user search and filtering
- [ ] Add user detail view
- [ ] Create KYC verification interface
- [ ] Implement user status management

**Key Components:**
```typescript
// pages/users/index.tsx
// pages/users/[id].tsx
// components/users/UserList.tsx
// components/users/UserDetails.tsx
// components/users/KYCVerification.tsx
// services/userService.ts
```

#### 4. Settlement Management
**Estimated Time: 4-5 days**

**Tasks:**
- [ ] Create settlement listing page
- [ ] Implement settlement detail view
- [ ] Add settlement processing interface
- [ ] Create settlement status management
- [ ] Add financial reconciliation tools

**Key Components:**
```typescript
// pages/settlements/index.tsx
// pages/settlements/[id].tsx
// components/settlements/SettlementList.tsx
// components/settlements/SettlementDetails.tsx
// components/settlements/ProcessingPanel.tsx
// services/settlementService.ts
```

### 🟡 MEDIUM PRIORITY (Should Have)

#### 5. Product Management
**Estimated Time: 4-5 days**

**Tasks:**
- [ ] Create product listing with filters
- [ ] Implement product detail view
- [ ] Add product moderation tools
- [ ] Create category management
- [ ] Add bulk operations

**Key Components:**
```typescript
// pages/products/index.tsx
// pages/products/[id].tsx
// components/products/ProductList.tsx
// components/products/ProductModeration.tsx
// components/products/CategoryManager.tsx
// services/productService.ts
```

#### 6. Order Management
**Estimated Time: 3-4 days**

**Tasks:**
- [ ] Create order listing page
- [ ] Implement order detail view
- [ ] Add order status tracking
- [ ] Create order analytics
- [ ] Add issue resolution tools

**Key Components:**
```typescript
// pages/orders/index.tsx
// pages/orders/[id].tsx
// components/orders/OrderList.tsx
// components/orders/OrderDetails.tsx
// components/orders/OrderAnalytics.tsx
// services/orderService.ts
```

#### 7. Analytics & Reporting
**Estimated Time: 4-5 days**

**Tasks:**
- [ ] Create comprehensive analytics dashboard
- [ ] Implement revenue reporting
- [ ] Add user analytics
- [ ] Create export functionality
- [ ] Add custom date range filters

**Key Components:**
```typescript
// pages/analytics/index.tsx
// components/analytics/RevenueChart.tsx
// components/analytics/UserAnalytics.tsx
// components/analytics/ExportPanel.tsx
// services/analyticsService.ts
```

### 🟢 LOW PRIORITY (Nice to Have)

#### 8. System Administration
**Estimated Time: 3-4 days**

**Tasks:**
- [ ] Create system settings page
- [ ] Implement role management
- [ ] Add permission controls
- [ ] Create audit logs
- [ ] Add system health monitoring

#### 9. Financial Management
**Estimated Time: 3-4 days**

**Tasks:**
- [ ] Create financial dashboard
- [ ] Implement fee management
- [ ] Add payment gateway config
- [ ] Create financial reports
- [ ] Add tax calculations

## 🛠️ Technical Implementation Details

### API Service Layer
```typescript
// services/api.ts
export class ApiService {
  private baseURL: string;
  private token: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL!;
    this.token = this.getToken();
  }

  private getToken(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_token') || '';
    }
    return '';
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options?.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // User Management
  async getUsers(params?: UserListParams): Promise<UserListResponse> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request(`/admin/users?${queryString}`);
  }

  async getUserById(id: string): Promise<User> {
    return this.request(`/admin/users/${id}`);
  }

  async updateUserStatus(id: string, status: UserStatus): Promise<User> {
    return this.request(`/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  // Settlement Management
  async getSettlements(params?: SettlementListParams): Promise<SettlementListResponse> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request(`/admin/settlements?${queryString}`);
  }

  async processSettlement(id: string): Promise<Settlement> {
    return this.request(`/admin/settlements/${id}/process`, {
      method: 'PUT',
    });
  }

  // Analytics
  async getDashboardData(): Promise<DashboardData> {
    return this.request('/admin/analytics/dashboard');
  }

  async getRevenueAnalytics(params: AnalyticsParams): Promise<RevenueAnalytics> {
    const queryString = new URLSearchParams(params as any).toString();
    return this.request(`/admin/analytics/revenue?${queryString}`);
  }
}
```

### State Management with Zustand
```typescript
// stores/adminStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface AdminState {
  user: AdminUser | null;
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setUser: (user: AdminUser) => void;
  logout: () => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAdminStore = create<AdminState>()(
  devtools(
    (set, get) => ({
      user: null,
      notifications: [],
      isLoading: false,
      error: null,

      setUser: (user) => set({ user }),
      logout: () => set({ user: null, notifications: [] }),
      addNotification: (notification) => 
        set((state) => ({ 
          notifications: [...state.notifications, notification] 
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
    }),
    { name: 'admin-store' }
  )
);
```

### Custom Hooks
```typescript
// hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';

export const useUsers = (params?: UserListParams) => {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => apiService.getUsers(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useUser = (id: string) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => apiService.getUserById(id),
    enabled: !!id,
  });
};

export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      apiService.updateUserStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
```

## 📊 Database Queries for Admin Panel

### User Analytics Queries
```sql
-- Total users by month
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as new_users,
  COUNT(CASE WHEN seller_kyc IS NOT NULL THEN 1 END) as verified_sellers
FROM users 
GROUP BY month 
ORDER BY month DESC;

-- User activity
SELECT 
  u.id,
  u.first_name,
  u.last_name,
  u.phone_number,
  COUNT(p.id) as products_count,
  COUNT(o.id) as orders_count,
  COUNT(s.id) as settlements_count
FROM users u
LEFT JOIN products p ON u.id = p.seller_id
LEFT JOIN orders o ON u.id = o.user_id
LEFT JOIN settlements s ON u.id = s.user_id
GROUP BY u.id, u.first_name, u.last_name, u.phone_number;
```

### Settlement Analytics Queries
```sql
-- Settlement summary
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount
FROM settlements 
GROUP BY status;

-- Settlement by date range
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as settlements_count,
  SUM(amount) as total_amount,
  SUM(service_fees_deducted) as total_fees
FROM settlements 
WHERE created_at >= $1 AND created_at <= $2
GROUP BY date 
ORDER BY date;
```

## 🎨 UI Component Examples

### Data Table Component
```typescript
// components/ui/DataTable.tsx
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';
import { Button } from './button';
import { Input } from './input';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onSearch?: (query: string) => void;
  isLoading?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  pageSize = 10,
  onPageChange,
  onSearch,
  isLoading
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    onPageChange?.(page);
  };

  return (
    <div className="space-y-4">
      {onSearch && (
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  No data found
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.render ? column.render(row) : row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {onPageChange && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, data.length)} of {data.length} results
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage * pageSize >= data.length}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] Environment variables configured
- [ ] API endpoints tested
- [ ] Authentication working
- [ ] Responsive design verified
- [ ] Performance optimized
- [ ] Error handling implemented

### Deployment Steps
1. **Build the application**
   ```bash
   npm run build
   ```

2. **Test the build**
   ```bash
   npm run start
   ```

3. **Deploy to staging**
   ```bash
   # Deploy to Vercel/Netlify/AWS
   ```

4. **Run smoke tests**
   - Login functionality
   - Dashboard loading
   - User management
   - Settlement processing

5. **Deploy to production**
   ```bash
   # Deploy to production environment
   ```

## 📞 Support & Resources

### Development Team Contacts
- **Lead Developer**: [Contact Info]
- **Backend Integration**: [Contact Info]
- **UI/UX Designer**: [Contact Info]

### Useful Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn/ui Components](https://ui.shadcn.com/)
- [React Query](https://tanstack.com/query/latest)
- [Zustand](https://github.com/pmndrs/zustand)

### Common Issues & Solutions
1. **API Integration Issues**
   - Check CORS configuration
   - Verify authentication headers
   - Test endpoints with Postman

2. **Build Issues**
   - Clear node_modules and reinstall
   - Check TypeScript errors
   - Verify environment variables

3. **Performance Issues**
   - Implement proper caching
   - Optimize bundle size
   - Use React.memo for components

---

**Last Updated**: [Current Date]
**Version**: 1.0.0
**Status**: Ready for Development 