import { useEffect } from 'react';
import { useLocation, matchPath, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAppSettings } from '@/context/AppSettingsContext';
import { Button } from '@/components/ui/button';

function titleForPath(pathname: string): string {
  const map: [string, string][] = [
    ['/buildings/:buildingId', 'Building'],
    ['/buildings', 'Overview'],
    ['/all-buildings', 'All Buildings'],
    ['/all-panels', 'All Panels'],
    ['/fire-zones', 'Fire Zones'],
    ['/fault-zones', 'Fault Zones'],
    ['/panels/:panelId', 'Panel'],
    ['/alerts', 'Alerts'],
    ['/building-management/new', 'New Building'],
    ['/building-management/:id/edit', 'Edit Building'],
    ['/building-management/:id', 'Building Details'],
    ['/building-management', 'Building Management'],
    ['/panel-management/new', 'New Panel'],
    ['/panel-management/:id/edit', 'Edit Panel'],
    ['/panel-management/:id', 'Panel Details'],
    ['/panel-management', 'Panel Management'],
    ['/groups/new', 'New Group'],
    ['/groups/:id/edit', 'Edit Group'],
    ['/groups/:id', 'Group Details'],
    ['/groups', 'Groups'],
    ['/locations/new', 'New Location'],
    ['/locations/:id/edit', 'Edit Location'],
    ['/locations/:id', 'Location Details'],
    ['/locations', 'Locations'],
    ['/organizations/new', 'New Organization'],
    ['/organizations/:id/edit', 'Edit Organization'],
    ['/organizations/:id', 'Organization Details'],
    ['/organizations', 'Organizations'],
    ['/roles/new', 'New Role'],
    ['/roles/:id/edit', 'Edit Role'],
    ['/roles/:id', 'Role Details'],
    ['/roles', 'Roles'],
    ['/login-logs', 'Login Logs'],
    ['/audit-log', 'Audit Log'],
    ['/users/new', 'New User'],
    ['/users/:id/edit', 'Edit User'],
    ['/users/:id', 'User Details'],
    ['/users', 'User Management'],
    ['/profile', 'My Profile'],
    ['/settings', 'Settings'],
  ];
  for (const [pattern, title] of map) if (matchPath(pattern, pathname)) return title;
  return '';
}

export default function Topbar() {
  const { user, logout } = useAuth();
  const { appName } = useAppSettings();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const pageTitle = titleForPath(pathname);

  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} — ${appName}` : appName;
  }, [pageTitle, appName]);

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
      <h2 className="text-xl font-bold tracking-tight">{pageTitle || appName}</h2>
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-secondary"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="leading-tight text-left">
            <div className="text-sm font-semibold">{user?.username}</div>
            <div className="max-w-[160px] truncate text-xs text-muted-foreground">{user?.roles?.join(', ') || 'No role'}</div>
          </div>
        </button>
        <Button variant="outline" size="sm" onClick={logout} className="gap-1.5">
          <LogOut className="h-3.5 w-3.5" />
          Logout
        </Button>
      </div>
    </header>
  );
}
