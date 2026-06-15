import { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import SummaryCards from '../components/dashboard/SummaryCards';
import ZoneGrid from '../components/dashboard/ZoneGrid';
import EventsLog from '../components/dashboard/EventsLog';
import { WaterLevelChart, PressureChart } from '../components/dashboard/ZoneCharts';
import UserManagement from '../components/dashboard/UserManagement';
import DeviceList from '../components/dashboard/DeviceList';
import DeviceManagement from '../components/dashboard/DeviceManagement';
import {
  fetchDevices,
  fetchZonesByDevice,
  fetchEventsByDevice,
  summariseZones,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';

const VIEW_TITLES = {
  devices: 'Devices',
  overview: 'Overview',
  fire: 'Fire Safety',
  water: 'Water Systems',
  events: 'Events Log',
  'manage-devices': 'Device Management',
  users: 'User Management',
};

const DEVICE_SCOPED = ['overview', 'fire', 'water', 'events'];

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  const [activeView, setActiveView] = useState('devices');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const [zones, setZones] = useState([]);
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);

  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [isLoadingDevice, setIsLoadingDevice] = useState(false);
  const [error, setError] = useState('');

  // Load the devices this user is allowed to see.
  const loadDevices = useCallback(async () => {
    try {
      setIsLoadingDevices(true);
      const data = await fetchDevices(user);
      setDevices(data);
    } catch (err) {
      setError(err.message || 'Failed to load devices');
    } finally {
      setIsLoadingDevices(false);
    }
  }, [user]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // Load a device's 16 zones + events when one is selected.
  const openDevice = useCallback(async (device) => {
    setSelectedDevice(device);
    setActiveView('overview');
    setIsLoadingDevice(true);
    setError('');
    try {
      const [zonesData, eventsData] = await Promise.all([
        fetchZonesByDevice(device.id),
        fetchEventsByDevice(device.id),
      ]);
      setZones(zonesData);
      setEvents(eventsData);
      setSummary(summariseZones(zonesData));
    } catch (err) {
      setError(err.message || 'Failed to load device data');
    } finally {
      setIsLoadingDevice(false);
    }
  }, []);

  function backToDevices() {
    setSelectedDevice(null);
    setZones([]);
    setEvents([]);
    setSummary(null);
    setActiveView('devices');
  }

  function handleNavigate(view) {
    // Device-scoped views need a selected device; bounce to the list if none.
    if (DEVICE_SCOPED.includes(view) && !selectedDevice) {
      setActiveView('devices');
      return;
    }
    setActiveView(view);
  }

  function handleAcknowledge(eventId) {
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, is_acknowledged: true } : e)));
  }

  const showingDeviceDashboard = DEVICE_SCOPED.includes(activeView) && selectedDevice;

  return (
    <DashboardLayout
      title={VIEW_TITLES[activeView]}
      activeView={activeView}
      onNavigate={handleNavigate}
      userRole={user?.role}
      selectedDevice={selectedDevice}
    >
      {error && <div className="dashboard-error-banner">{error}</div>}

      {activeView === 'devices' && (
        isLoadingDevices ? (
          <DashboardSpinner label="Loading devices…" />
        ) : (
          <DeviceList devices={devices} onOpen={openDevice} isAdmin={isAdmin} />
        )
      )}

      {activeView === 'manage-devices' && isAdmin && (
        <DeviceManagement onChanged={loadDevices} />
      )}

      {activeView === 'users' && isAdmin && <UserManagement />}

      {showingDeviceDashboard && (
        <>
          <DeviceContextBar device={selectedDevice} onBack={backToDevices} />
          {isLoadingDevice ? (
            <DashboardSpinner label="Loading device data…" />
          ) : (
            <>
              {activeView === 'overview' && (
                <>
                  <SummaryCards summary={summary} />
                  <div className="dashboard-charts-row">
                    <WaterLevelChart zones={zones} />
                    <PressureChart zones={zones} />
                  </div>
                  <EventsLog events={events.slice(0, 3)} onAcknowledge={handleAcknowledge} />
                  <ZoneGrid zones={zones} title="All Zones (16)" />
                </>
              )}
              {activeView === 'fire' && (
                <>
                  <SummaryCards summary={summary} />
                  <ZoneGrid zones={zones} title="Fire Detection — Zones 1–16" defaultFilter="all" />
                </>
              )}
              {activeView === 'water' && (
                <>
                  <div className="dashboard-charts-row">
                    <WaterLevelChart zones={zones} />
                    <PressureChart zones={zones} />
                  </div>
                  <ZoneGrid zones={zones} title="Water Systems — Zones (1-16)" defaultFilter="all" />
                </>
              )}
              {activeView === 'events' && (
                <EventsLog events={events} onAcknowledge={handleAcknowledge} />
              )}
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

function DeviceContextBar({ device, onBack }) {
  return (
    <div className="device-context-bar">
      <button className="device-context-back" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All Devices
      </button>
      <div className="device-context-info">
        <span className="device-context-name">{device.device_remarks || device.device_uuid}</span>
        <span className="device-context-uuid">{device.device_uuid}</span>
        {device.group_name && <span className="device-context-group">{device.group_name}</span>}
      </div>
    </div>
  );
}

function DashboardSpinner({ label }) {
  return (
    <div className="dashboard-loading">
      <div className="dashboard-loading-spinner" />
      <p>{label}</p>
    </div>
  );
}
