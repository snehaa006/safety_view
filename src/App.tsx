import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminRoute from '@/components/auth/AdminRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoginPage from '@/pages/LoginPage';
import BuildingsPage from '@/pages/BuildingsPage';
import BuildingPanelsPage from '@/pages/BuildingPanelsPage';
import PanelZonesPage from '@/pages/PanelZonesPage';
import AlertsPage from '@/pages/AlertsPage';
import ProfilePage from '@/pages/ProfilePage';
import SettingsPage from '@/pages/SettingsPage';
import UserManagementPage from '@/pages/UserManagementPage';
import UserFormPage from '@/pages/UserFormPage';
import UserDetailPage from '@/pages/UserDetailPage';
import RolesPage from '@/pages/RolesPage';
import OrganizationsPage from '@/pages/OrganizationsPage';
import GroupsPage from '@/pages/GroupsPage';
import LocationsPage from '@/pages/LocationsPage';
import BuildingManagementPage from '@/pages/BuildingManagementPage';
import PanelManagementPage from '@/pages/PanelManagementPage';
import AuditLogPage from '@/pages/AuditLogPage';
import LoginLogsPage from '@/pages/LoginLogsPage';
import AllBuildingsPage from '@/pages/AllBuildingsPage';
import AllPanelsPage from '@/pages/AllPanelsPage';
import ZonesByStatePage from '@/pages/ZonesByStatePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/buildings" element={<BuildingsPage />} />
              <Route path="/buildings/:buildingId" element={<BuildingPanelsPage />} />
              <Route path="/all-buildings" element={<AllBuildingsPage />} />
              <Route path="/all-panels" element={<AllPanelsPage />} />
              <Route path="/fire-zones" element={<ZonesByStatePage />} />
              <Route path="/fault-zones" element={<ZonesByStatePage />} />
              <Route path="/panels/:panelId" element={<PanelZonesPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />

              <Route element={<AdminRoute />}>
                <Route path="/users" element={<UserManagementPage />} />
                <Route path="/users/new" element={<UserFormPage />} />
                <Route path="/users/:id" element={<UserDetailPage />} />
                <Route path="/users/:id/edit" element={<UserFormPage />} />
                <Route path="/roles" element={<RolesPage />} />
                <Route path="/organizations" element={<OrganizationsPage />} />
                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/locations" element={<LocationsPage />} />
                <Route path="/building-management" element={<BuildingManagementPage />} />
                <Route path="/panel-management" element={<PanelManagementPage />} />
                <Route path="/audit-log" element={<AuditLogPage />} />
                <Route path="/login-logs" element={<LoginLogsPage />} />
              </Route>

              <Route index element={<Navigate to="/buildings" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/buildings" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
