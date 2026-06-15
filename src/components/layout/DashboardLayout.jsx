import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './DashboardLayout.css';

export default function DashboardLayout({ title, children, activeView, onNavigate, userRole, selectedDevice }) {
  return (
    <div className="dashboard-layout">
      <Sidebar
        activeView={activeView}
        onNavigate={onNavigate}
        userRole={userRole}
        selectedDevice={selectedDevice}
      />
      <div className="dashboard-main">
        <Topbar title={title} selectedDevice={selectedDevice} />
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
