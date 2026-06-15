import './Sidebar.css';

const NAV_ITEMS = [
  { key: 'overview', label: 'Overview', icon: 'grid' },
  { key: 'fire', label: 'Fire Safety', icon: 'flame' },
  { key: 'water', label: 'Water Systems', icon: 'droplet' },
  { key: 'events', label: 'Events Log', icon: 'bell' },
];

const ICONS = {
  grid: (
    <path d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z" />
  ),
  flame: (
    <path d="M12 2C9 6 6 9.5 6 13a6 6 0 0012 0c0-3.5-3-7-6-11zM12 8c1.2 2 2.2 3.6 2.2 5a2.2 2.2 0 11-4.4 0c0-1.4 1-3 2.2-5z" />
  ),
  droplet: (
    <path d="M12 2C8.5 7 5 11 5 14.5a7 7 0 0014 0C19 11 15.5 7 12 2z" />
  ),
  bell: (
    <path d="M12 2a6 6 0 00-6 6v3.5c0 .9-.4 1.8-1.1 2.4L4 15h16l-.9-1.1A3.5 3.5 0 0118 11.5V8a6 6 0 00-6-6zM9.5 19a2.5 2.5 0 005 0h-5z" />
  ),
};

export default function Sidebar({ activeView, onNavigate }) {
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
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`sidebar-nav-item ${activeView === item.key ? 'active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              {ICONS[item.icon]}
            </svg>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-panel-status">
          <span className="status-dot status-dot--normal" aria-hidden="true" />
          <div>
            <div className="sidebar-panel-name">Main Fire Panel</div>
            <div className="sidebar-panel-id">FACP_001</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
