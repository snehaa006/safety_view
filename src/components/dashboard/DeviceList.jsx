import './DeviceList.css';

const STATUS_LABEL = {
  ASSIGNED: 'Assigned',
  NOT_ASSIGNED: 'Not assigned',
};

export default function DeviceList({ devices, onOpen, isAdmin }) {
  if (!devices || devices.length === 0) {
    return (
      <div className="device-list-empty">
        {isAdmin
          ? 'No devices yet. Add one from Device Management.'
          : 'No device has been assigned to your account yet. Please contact your administrator.'}
      </div>
    );
  }

  return (
    <section className="device-list-section">
      <div className="device-list-header">
        <h3>{isAdmin ? 'All Devices' : 'Your Device'}</h3>
        <p className="device-list-subtitle">
          Tap a device to open its dashboard and view all 16 zones
        </p>
      </div>

      <div className="device-grid">
        {devices.map((d) => {
          const fire = d.summary?.fireAlarms ?? 0;
          const fault = d.summary?.faults ?? 0;
          const tone = fire > 0 ? 'critical' : fault > 0 ? 'warning' : 'normal';
          return (
            <button
              key={d.id}
              className={`device-card device-card--${tone}`}
              onClick={() => onOpen(d)}
            >
              <div className="device-card-top">
                <div className="device-card-icon" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="3" width="16" height="18" rx="2" />
                    <path d="M8 7h8M8 11h8M8 15h5" strokeLinecap="round" />
                  </svg>
                </div>
                <span className={`device-card-status device-card-status--${d.status === 'ASSIGNED' ? 'on' : 'off'}`}>
                  {STATUS_LABEL[d.status] || d.status}
                </span>
              </div>

              <div className="device-card-name">{d.device_remarks || d.device_uuid}</div>
              <div className="device-card-uuid">{d.device_uuid}</div>
              {d.group_name && <div className="device-card-group">{d.group_name}</div>}

              <div className="device-card-stats">
                <span className="device-card-stat">
                  <strong>{d.summary?.totalZones ?? 0}</strong> zones
                </span>
                <span className={`device-card-stat ${fire > 0 ? 'stat--fire' : ''}`}>
                  <strong>{fire}</strong> fire
                </span>
                <span className={`device-card-stat ${fault > 0 ? 'stat--fault' : ''}`}>
                  <strong>{fault}</strong> fault
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
