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
              <Suspense fallback={<PageLoader tip="Loading Asset Operations Center..." />}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: 'assets',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Hardware Fleet..." />}>
                <AssetsPage />
              </Suspense>
            ),
          },
          {
            path: 'licenses',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Software & SaaS Assets..." />}>
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
              <Suspense
                fallback={<PageLoader tip="Loading Enterprise Organization Structure..." />}
              >
                <OrganizationPage />
              </Suspense>
            ),
          },
          {
            path: 'users',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Active Directory & Users Hub..." />}>
                <UsersPage />
              </Suspense>
            ),
          },
          {
            path: 'network',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Network Infrastructure..." />}>
                <NetworkPage />
              </Suspense>
            ),
          },
          {
            path: 'inventory',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Spare Stockroom..." />}>
                <InventoryPage />
              </Suspense>
            ),
          },
          {
            path: 'audit',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Security Audit Trail..." />}>
                <AuditPage />
              </Suspense>
            ),
          },
          {
            path: 'reports',
            element: (
              <Suspense fallback={<PageLoader tip="Loading Executive Reports..." />}>
                <ReportsPage />
              </Suspense>
            ),
          },
          {
            path: 'settings',
            element: (
              <Suspense fallback={<PageLoader tip="Loading System Configuration..." />}>
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
