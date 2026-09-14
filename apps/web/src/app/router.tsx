import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import PageLoader from '../components/PageLoader';
import RouteErrorBoundary from '../components/RouteErrorBoundary';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';

const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const AssetsPage = lazy(() => import('../pages/assets/AssetsPage'));
const LicensesPage = lazy(() => import('../pages/licenses/LicensesPage'));
const OrganizationPage = lazy(() => import('../pages/organization/OrganizationPage'));
const AccessControlPage = lazy(() => import('../pages/access/AccessControlPage'));
const DirectoryPage = lazy(() => import('../pages/directory/DirectoryPage'));
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
    ErrorBoundary: RouteErrorBoundary,
  },
  {
    path: '/',
    element: <AuthLayout />,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      {
        element: <MainLayout />,
        ErrorBoundary: RouteErrorBoundary,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageLoader tip="Loading Dashboard..." />}>
                <DashboardPage />
              </Suspense>
            ),
            ErrorBoundary: RouteErrorBoundary,
          },
          {
            path: 'assets',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Hardware Assets..." />}>
                <AssetsPage />
              </Suspense>
            ),
            ErrorBoundary: RouteErrorBoundary,
          },
          {
            path: 'licenses',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Software Licenses..." />}>
                <LicensesPage />
              </Suspense>
            ),
            ErrorBoundary: RouteErrorBoundary,
          },
          {
            path: 'users',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Users..." />}>
                <AccessControlPage />
              </Suspense>
            ),
            ErrorBoundary: RouteErrorBoundary,
          },
          {
            path: 'directory',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Employee Directory..." />}>
                <DirectoryPage />
              </Suspense>
            ),
            ErrorBoundary: RouteErrorBoundary,
          },
          {
            path: 'organization',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Organization Structure..." />}>
                <OrganizationPage />
              </Suspense>
            ),
            ErrorBoundary: RouteErrorBoundary,
          },
          {
            path: 'access-control',
            element: <Navigate to="/users" replace />,
          },
          {
            path: 'network',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Network & IPAM..." />}>
                <NetworkPage />
              </Suspense>
            ),
            ErrorBoundary: RouteErrorBoundary,
          },
          {
            path: 'inventory',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Inventory..." />}>
                <InventoryPage />
              </Suspense>
            ),
            ErrorBoundary: RouteErrorBoundary,
          },
          {
            path: 'audit',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Audit Trail..." />}>
                <AuditPage />
              </Suspense>
            ),
            ErrorBoundary: RouteErrorBoundary,
          },
          {
            path: 'reports',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Reports & Analytics..." />}>
                <ReportsPage />
              </Suspense>
            ),
            ErrorBoundary: RouteErrorBoundary,
          },
          {
            path: 'notifications',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Notifications..." />}>
                <NotificationsPage />
              </Suspense>
            ),
            ErrorBoundary: RouteErrorBoundary,
          },
          {
            path: 'settings',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Settings..." />}>
                <SettingsPage />
              </Suspense>
            ),
            ErrorBoundary: RouteErrorBoundary,
          },
          {
            path: '*',
            element: (
              <Suspense fallback={<PageLoader tip="Navigating..." />}>
                <NotFoundPage />
              </Suspense>
            ),
            ErrorBoundary: RouteErrorBoundary,
          },
        ],
      },
    ],
  },
]);
