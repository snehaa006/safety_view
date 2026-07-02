import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { AppSettingsProvider } from '@/context/AppSettingsContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AdminRoute from '@/components/auth/AdminRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import LoginPage from '@/pages/LoginPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
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
import RoleDetailPage from '@/pages/RoleDetailPage';
import RoleFormPage from '@/pages/RoleFormPage';
import OrganizationsPage from '@/pages/OrganizationsPage';
import OrganizationDetailPage from '@/pages/OrganizationDetailPage';
import OrganizationFormPage from '@/pages/OrganizationFormPage';
import GroupsPage from '@/pages/GroupsPage';
import GroupDetailPage from '@/pages/GroupDetailPage';
import GroupFormPage from '@/pages/GroupFormPage';
import LocationsPage from '@/pages/LocationsPage';
import LocationDetailPage from '@/pages/LocationDetailPage';
import LocationFormPage from '@/pages/LocationFormPage';
import BuildingManagementPage from '@/pages/BuildingManagementPage';
import BuildingDetailPage from '@/pages/BuildingDetailPage';
import BuildingFormPage from '@/pages/BuildingFormPage';
import PanelManagementPage from '@/pages/PanelManagementPage';
import PanelAdminDetailPage from '@/pages/PanelAdminDetailPage';
import PanelAdminFormPage from '@/pages/PanelAdminFormPage';
import AuditLogPage from '@/pages/AuditLogPage';
import LoginLogsPage from '@/pages/LoginLogsPage';
import AllBuildingsPage from '@/pages/AllBuildingsPage';
import AllPanelsPage from '@/pages/AllPanelsPage';
import ZonesByStatePage from '@/pages/ZonesByStatePage';
import ReportsPage from '@/pages/ReportsPage';

export default function App() {
  return (
    <AppSettingsProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />

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
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />

              <Route element={<AdminRoute />}>
                <Route path="/users" element={<UserManagementPage />} />
                <Route path="/users/new" element={<UserFormPage />} />
                <Route path="/users/:id" element={<UserDetailPage />} />
                <Route path="/users/:id/edit" element={<UserFormPage />} />

                <Route path="/roles" element={<RolesPage />} />
                <Route path="/roles/new" element={<RoleFormPage />} />
                <Route path="/roles/:id" element={<RoleDetailPage />} />
                <Route path="/roles/:id/edit" element={<RoleFormPage />} />

                <Route path="/organizations" element={<OrganizationsPage />} />
                <Route path="/organizations/new" element={<OrganizationFormPage />} />
                <Route path="/organizations/:id" element={<OrganizationDetailPage />} />
                <Route path="/organizations/:id/edit" element={<OrganizationFormPage />} />

                <Route path="/groups" element={<GroupsPage />} />
                <Route path="/groups/new" element={<GroupFormPage />} />
                <Route path="/groups/:id" element={<GroupDetailPage />} />
                <Route path="/groups/:id/edit" element={<GroupFormPage />} />

                <Route path="/locations" element={<LocationsPage />} />
                <Route path="/locations/new" element={<LocationFormPage />} />
                <Route path="/locations/:id" element={<LocationDetailPage />} />
                <Route path="/locations/:id/edit" element={<LocationFormPage />} />

                <Route path="/building-management" element={<BuildingManagementPage />} />
                <Route path="/building-management/new" element={<BuildingFormPage />} />
                <Route path="/building-management/:id" element={<BuildingDetailPage />} />
                <Route path="/building-management/:id/edit" element={<BuildingFormPage />} />

                <Route path="/panel-management" element={<PanelManagementPage />} />
                <Route path="/panel-management/new" element={<PanelAdminFormPage />} />
                <Route path="/panel-management/:id" element={<PanelAdminDetailPage />} />
                <Route path="/panel-management/:id/edit" element={<PanelAdminFormPage />} />

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
    </AppSettingsProvider>
  );
}
