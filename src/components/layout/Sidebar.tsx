import { NavLink } from 'react-router-dom';
import { Building2, ClipboardList, Cog, Droplet, FolderTree, LayoutGrid, MapPin, Server, Settings, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isAdminUser } from '@/lib/roles';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutGrid;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/devices', label: 'Devices', icon: Server },
  { to: '/device-management', label: 'Device Management', icon: Cog, adminOnly: true },
  { to: '/users', label: 'User Management', icon: Users, adminOnly: true },
  { to: '/organizations', label: 'Organizations', icon: Building2, adminOnly: true },
  { to: '/groups', label: 'Groups', icon: FolderTree, adminOnly: true },
  { to: '/locations', label: 'Locations', icon: MapPin, adminOnly: true },
  { to: '/audit-log', label: 'Audit Log', icon: ClipboardList, adminOnly: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { user } = useAuth();
  const isAdmin = isAdminUser(user);
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin);

  return (
    <aside className="sticky top-0 hidden h-screen w-56 flex-shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex items-center gap-2 border-b border-border px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-water-border bg-water-bg">
          <Droplet className="h-4 w-4 text-accent" />
        </div>
        <span className="text-lg font-bold tracking-tight">SafetyView</span>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-water-bg text-water-text'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
          <div className="leading-tight">
            <div className="text-sm font-semibold">{user?.username}</div>
            <div className="text-xs text-muted-foreground">{String(user?.role || '').replace(/_/g, ' ')}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
