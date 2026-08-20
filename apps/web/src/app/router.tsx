import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import PageLoader from '../components/PageLoader';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';

const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const AssetsPage = lazy(() => import('../pages/assets/AssetsPage'));
const LicensesPage = lazy(() => import('../pages/licenses/LicensesPage'));
const OrganizationPage = lazy(() => import('../pages/organization/OrganizationPage'));
const UsersPage = lazy(() => import('../pages/users/UsersPage'));
const NetworkPage = lazy(() => import('../pages/network/NetworkPage'));
const InventoryPage = lazy(() => import('../pages/inventory/InventoryPage'));
const AuditPage = lazy(() => import('../pages/audit/AuditPage'));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage'));
const NotificationsPage = lazy(() => import('../pages/notifications/NotificationsPage'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoader tip="Loading authentication..." />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader tip="Loading Dashboard..." />}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: 'assets',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Hardware Assets..." />}>
                <AssetsPage />
              </Suspense>
            ),
          },
          {
            path: 'licenses',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Software Licenses..." />}>
                <LicensesPage />
              </Suspense>
            ),
          },
          {
            path: 'directory',
            element: <Navigate to="/users" replace />,
          },
          {
            path: 'organization',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Organization Structure..." />}>
                <OrganizationPage />
              </Suspense>
            ),
          },
          {
            path: 'users',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Users & Access..." />}>
                <UsersPage />
              </Suspense>
            ),
          },
          {
            path: 'network',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Network & IPAM..." />}>
                <NetworkPage />
              </Suspense>
            ),
          },
          {
            path: 'inventory',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Inventory Management..." />}>
                <InventoryPage />
              </Suspense>
            ),
          },
          {
            path: 'audit',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Audit Trail..." />}>
                <AuditPage />
              </Suspense>
            ),
          },
          {
            path: 'reports',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Reports & Analytics..." />}>
                <ReportsPage />
              </Suspense>
            ),
          },
          {
            path: 'notifications',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Notification Center..." />}>
                <NotificationsPage />
              </Suspense>
            ),
          },
          {
            path: 'settings',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Settings..." />}>
                <SettingsPage />
              </Suspense>
            ),
          },
          {
            path: '*',
            element: (
              <Suspense fallback={<PageLoader tip="Navigating..." />}>
                <NotFoundPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
]);
