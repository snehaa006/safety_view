import { useLocation, matchPath } from 'react-router-dom';
import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
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
    ['/building-management', 'Building Management'],
    ['/panel-management', 'Panel Management'],
    ['/groups', 'Groups'],
    ['/locations', 'Locations'],
    ['/organizations', 'Organizations'],
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
  return 'SafetyView';
}

export default function Topbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
      <h2 className="text-xl font-bold tracking-tight">{titleForPath(pathname)}</h2>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 rounded-full border border-ok-border bg-ok-bg px-3 py-1 text-xs font-medium text-ok-text">
          <Clock className="h-3.5 w-3.5" />
          <span>Live</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{user?.username}</div>
            <div className="max-w-[160px] truncate text-xs text-muted-foreground">{user?.roles?.join(', ') || 'No role'}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Sign out"><LogOut className="h-4 w-4" /></Button>
        </div>
      </div>
    </header>
  );
}
