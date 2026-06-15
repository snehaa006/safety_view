import './Sidebar.css';

// Top-level items (always available, subject to admin gating)
const MAIN_ITEMS = [
  { key: 'devices', label: 'Devices', icon: 'device' },
  { key: 'manage-devices', label: 'Device Management', icon: 'cog', adminOnly: true },
  { key: 'users', label: 'User Management', icon: 'users', adminOnly: true },
];

// Items that only make sense once a device is selected
const DEVICE_ITEMS = [
  { key: 'overview', label: 'Overview', icon: 'grid' },
  { key: 'fire', label: 'Fire Safety', icon: 'flame' },
  { key: 'water', label: 'Water Systems', icon: 'droplet' },
  { key: 'events', label: 'Events Log', icon: 'bell' },
];

const ICONS = {
  grid: (<path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />),
  flame: (<path d="M12 2C9 6 6 9.5 6 13a6 6 0 0012 0c0-3.5-3-7-6-11zM12 8c1.2 2 2.2 3.6 2.2 5a2.2 2.2 0 11-4.4 0c0-1.4 1-3 2.2-5z" />),
  droplet: (<path d="M12 2C8.5 7 5 11 5 14.5a7 7 0 0014 0C19 11 15.5 7 12 2z" />),
  bell: (<path d="M12 2a6 6 0 00-6 6v3.5c0 .9-.4 1.8-1.1 2.4L4 15h16l-.9-1.1A3.5 3.5 0 0118 11.5V8a6 6 0 00-6-6zM9.5 19a2.5 2.5 0 005 0h-5z" />),
  users: (<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>),
  device: (<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h8M8 15h5" /></>),
  cog: (<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></>),
};

function NavButton({ item, activeView, onNavigate }) {
  const stroke = item.icon === 'cog' || item.icon === 'device';
  return (
    <button
      className={`sidebar-nav-item ${activeView === item.key ? 'active' : ''}`}
      onClick={() => onNavigate(item.key)}
    >
      <svg
        width="18" height="18" viewBox="0 0 24 24"
        fill={stroke ? 'none' : 'currentColor'}
        stroke={stroke ? 'currentColor' : 'none'}
        strokeWidth={stroke ? 2 : 0}
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        {ICONS[item.icon]}
      </svg>
      <span>{item.label}</span>
    </button>
  );
}

export default function Sidebar({ activeView, onNavigate, userRole, selectedDevice }) {
  const isAdmin = userRole?.toUpperCase() === 'ADMIN';
  const visibleMain = MAIN_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-accent-deep)" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C9 6 6 9.5 6 13a6 6 0 0012 0c0-3.5-3-7-6-11z" />
          </svg>
        </div>
        <span className="sidebar-logo-text">SafetyView</span>
      </div>

      <nav className="sidebar-nav">
        {visibleMain.map((item) => (
          <NavButton key={item.key} item={item} activeView={activeView} onNavigate={onNavigate} />
        ))}

        {selectedDevice && (
          <>
            <div className="sidebar-nav-group-label">
              {selectedDevice.device_remarks || selectedDevice.device_uuid}
            </div>
            {DEVICE_ITEMS.map((item) => (
              <NavButton key={item.key} item={item} activeView={activeView} onNavigate={onNavigate} />
            ))}
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-panel-status">
          <span
            className={`status-dot status-dot--${
              selectedDevice
                ? selectedDevice.summary?.fireAlarms > 0
                  ? 'alarm'
                  : selectedDevice.summary?.faults > 0
                  ? 'fault'
                  : 'normal'
                : 'normal'
            }`}
            aria-hidden="true"
          />
          <div>
            <div className="sidebar-panel-name">
              {selectedDevice ? (selectedDevice.device_remarks || 'Device') : 'No device selected'}
            </div>
            <div className="sidebar-panel-id">
              {selectedDevice ? selectedDevice.device_uuid : 'Pick a device to begin'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
