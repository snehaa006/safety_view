import { useLocation, matchPath } from 'react-router-dom';
import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

function titleForPath(pathname: string): string {
  if (matchPath('/devices', pathname)) return 'Devices';
  if (matchPath('/devices/*', pathname)) return 'Device Dashboard';
  if (matchPath('/device-management', pathname)) return 'Device Management';
  if (matchPath('/organizations', pathname)) return 'Organizations';
  if (matchPath('/groups', pathname)) return 'Groups';
  if (matchPath('/settings', pathname)) return 'Settings';
  if (matchPath('/users/new', pathname)) return 'New User';
  if (matchPath('/users/:id/edit', pathname)) return 'Edit User';
  if (matchPath('/users/:id', pathname)) return 'User Details';
  if (matchPath('/users', pathname)) return 'User Management';
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
            <div className="text-xs text-muted-foreground">
              {String(user?.role || '').replace(/_/g, ' ')}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
