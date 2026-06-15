import { useEffect, useState } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import SummaryCards from '../components/dashboard/SummaryCards';
import ZoneGrid from '../components/dashboard/ZoneGrid';
import EventsLog from '../components/dashboard/EventsLog';
import { WaterLevelChart, PressureChart } from '../components/dashboard/ZoneCharts';
import UserManagement from '../components/dashboard/UserManagement';
import { fetchBuilding, fetchZones, fetchEvents, fetchSummary } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';

const VIEW_TITLES = {
  overview: 'Overview',
  fire: 'Fire Safety',
  water: 'Water Systems',
  events: 'Events Log',
  users: 'User Management',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState('overview');
  const [building, setBuilding] = useState(null);
  const [zones, setZones] = useState([]);
  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [buildingData, zonesData, eventsData, summaryData] = await Promise.all([
          fetchBuilding(), fetchZones(), fetchEvents(), fetchSummary(),
        ]);
        if (!isMounted) return;
        setBuilding(buildingData);
        setZones(zonesData);
        setEvents(eventsData);
        setSummary(summaryData);
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load dashboard data');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  function handleAcknowledge(eventId) {
    setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, is_acknowledged: true } : e)));
  }

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading-spinner" />
        <p>Loading dashboard data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-loading">
        <p className="dashboard-error">{error}</p>
      </div>
    );
  }

  return (
    <DashboardLayout
      building={building}
      title={VIEW_TITLES[activeView]}
      activeView={activeView}
      onNavigate={setActiveView}
      userRole={user?.role}
    >
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
      {activeView === 'users' && user?.role?.toUpperCase() === 'ADMIN' && (
        <UserManagement />
      )}
    </DashboardLayout>
  );
}