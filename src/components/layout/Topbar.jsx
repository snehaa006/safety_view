import { useAuth } from '../../context/AuthContext';
import './Topbar.css';

export default function Topbar({ title, selectedDevice }) {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-title">
        <h2>{title}</h2>
        {selectedDevice && (
          <p>
            {(selectedDevice.device_remarks || selectedDevice.device_uuid)}
            {selectedDevice.group_name ? ` · ${selectedDevice.group_name}` : ''}
          </p>
        )}
      </div>

      <div className="topbar-actions">
        <div className="topbar-time">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" strokeLinecap="round" />
          </svg>
          <span>Live</span>
        </div>

        <div className="topbar-user">
          <div className="topbar-user-avatar">{user?.username?.charAt(0).toUpperCase()}</div>
          <div className="topbar-user-info">
            <div className="topbar-user-name">{user?.username}</div>
            <div className="topbar-user-role">{user?.role?.replace('_', ' ')}</div>
          </div>
          <button className="topbar-logout" onClick={logout} title="Sign out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
