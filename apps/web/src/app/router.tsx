import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';

const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));
const AssetsPage = lazy(() => import('../pages/assets/AssetsPage'));
const LicensesPage = lazy(() => import('../pages/licenses/LicensesPage'));
const DirectoryPage = lazy(() => import('../pages/directory/DirectoryPage'));
const EmailPage = lazy(() => import('../pages/email/EmailPage'));
const NetworkPage = lazy(() => import('../pages/network/NetworkPage'));
const InventoryPage = lazy(() => import('../pages/inventory/InventoryPage'));
const TicketsPage = lazy(() => import('../pages/tickets/TicketsPage'));
const AuditPage = lazy(() => import('../pages/audit/AuditPage'));
const ReportsPage = lazy(() => import('../pages/reports/ReportsPage'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<div>Loading...</div>}>
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
              <Suspense fallback={<div>Loading...</div>}>
                <DashboardPage />
              </Suspense>
            ),
          },
          {
            path: 'assets',
            element: (
              <Suspense fallback={<div>Loading...</div>}>
                <AssetsPage />
              </Suspense>
            ),
          },
          {
            path: 'licenses',
            element: (
              <Suspense fallback={<div>Loading...</div>}>
                <LicensesPage />
              </Suspense>
            ),
          },
          {
            path: 'directory',
            element: (
              <Suspense fallback={<div>Loading...</div>}>
                <DirectoryPage />
              </Suspense>
            ),
          },
          {
            path: 'email',
            element: (
              <Suspense fallback={<div>Loading...</div>}>
                <EmailPage />
              </Suspense>
            ),
          },
          {
            path: 'network',
            element: (
              <Suspense fallback={<div>Loading...</div>}>
                <NetworkPage />
              </Suspense>
            ),
          },
          {
            path: 'inventory',
            element: (
              <Suspense fallback={<div>Loading...</div>}>
                <InventoryPage />
              </Suspense>
            ),
          },
          {
            path: 'tickets',
            element: (
              <Suspense fallback={<div>Loading...</div>}>
                <TicketsPage />
              </Suspense>
            ),
          },
          {
            path: 'audit',
            element: (
              <Suspense fallback={<div>Loading...</div>}>
                <AuditPage />
              </Suspense>
            ),
          },
          {
            path: 'reports',
            element: (
              <Suspense fallback={<div>Loading...</div>}>
                <ReportsPage />
              </Suspense>
            ),
          },
          {
            path: 'settings',
            element: (
              <Suspense fallback={<div>Loading...</div>}>
                <SettingsPage />
              </Suspense>
            ),
          },
          {
            path: '*',
            element: (
              <Suspense fallback={<div>Loading...</div>}>
                <NotFoundPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
]);
