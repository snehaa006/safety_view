import { NavLink } from 'react-router-dom';
import {
  Bell, Building2, ClipboardList, Cpu, Droplet, FolderTree, KeyRound,
  LogIn, MapPin, ShieldCheck, User, Users, Warehouse,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isAdminUser } from '@/lib/roles';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Users;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/buildings', label: 'Overview', icon: Warehouse },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/building-management', label: 'Building Management', icon: Building2, adminOnly: true },
  { to: '/panel-management', label: 'Panel Management', icon: Cpu, adminOnly: true },
  { to: '/groups', label: 'Groups', icon: FolderTree, adminOnly: true },
  { to: '/locations', label: 'Locations', icon: MapPin, adminOnly: true },
  { to: '/organizations', label: 'Organizations', icon: Building2, adminOnly: true },
  { to: '/users', label: 'Users', icon: Users, adminOnly: true },
  { to: '/roles', label: 'Roles', icon: KeyRound, adminOnly: true },
  { to: '/login-logs', label: 'Login Logs', icon: LogIn, adminOnly: true },
  { to: '/audit-log', label: 'Audit Log', icon: ClipboardList, adminOnly: true },
  { to: '/profile', label: 'My Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: ShieldCheck },
];

export default function Sidebar() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin);
  const appName = localStorage.getItem('sv_app_name') || 'SafetyView';
  const appLogo = localStorage.getItem('sv_app_logo') || '';

  return (
    <aside className="sticky top-0 hidden h-screen w-56 flex-shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex items-center gap-2 border-b border-border px-5 py-5">
        {appLogo ? (
          <img src={appLogo} alt="Logo" className="h-8 w-8 rounded-md object-contain" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-water-border bg-water-bg">
            <Droplet className="h-4 w-4 text-accent" />
          </div>
        )}
        <span className="text-lg font-bold tracking-tight">{appName}</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-water-bg text-water-text' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <NavLink
        to="/profile"
        className="flex items-center gap-3 border-t border-border px-5 py-4 transition-colors hover:bg-secondary"
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {user?.username?.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-semibold">{user?.username}</div>
          <div className="truncate text-xs text-muted-foreground">{user?.roles?.join(', ') || 'No role'}</div>
        </div>
      </NavLink>
    </aside>
  );
}
