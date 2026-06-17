import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminRoute from '@/components/auth/AdminRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoginPage from '@/pages/LoginPage';
import DevicesPage from '@/pages/DevicesPage';
import DeviceManagementPage from '@/pages/DeviceManagementPage';
import UserManagementPage from '@/pages/UserManagementPage';
import UserFormPage from '@/pages/UserFormPage';
import UserDetailPage from '@/pages/UserDetailPage';
import OrganizationsPage from '@/pages/OrganizationsPage';
import GroupsPage from '@/pages/GroupsPage';
import LocationsPage from '@/pages/LocationsPage';
import AuditLogPage from '@/pages/AuditLogPage';
import SettingsPage from '@/pages/SettingsPage';
import DeviceDashboardPage, {
  DeviceOverview,
  DeviceFire,
  DeviceWater,
  DeviceEvents,
} from '@/pages/DeviceDashboardPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/devices" element={<DevicesPage />} />

              <Route path="/devices/:deviceId" element={<DeviceDashboardPage />}>
                <Route index element={<DeviceOverview />} />
                <Route path="fire" element={<DeviceFire />} />
                <Route path="water" element={<DeviceWater />} />
                <Route path="events" element={<DeviceEvents />} />
              </Route>

              <Route path="/settings" element={<SettingsPage />} />

              {/* Admin-only routes */}
              <Route element={<AdminRoute />}>
                <Route path="/device-management" element={<DeviceManagementPage />} />
                <Route path="/organizations" element={<OrganizationsPage />} />
                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/locations" element={<LocationsPage />} />
                <Route path="/audit-log" element={<AuditLogPage />} />
                <Route path="/users" element={<UserManagementPage />} />
                <Route path="/users/new" element={<UserFormPage />} />
                <Route path="/users/:id" element={<UserDetailPage />} />
                <Route path="/users/:id/edit" element={<UserFormPage />} />
              </Route>

              <Route index element={<Navigate to="/devices" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/devices" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
