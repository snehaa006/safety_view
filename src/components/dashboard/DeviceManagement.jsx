import { useEffect, useState } from 'react';
import {
  fetchDevices,
  fetchGroups,
  createDevice,
  updateDevice,
  deleteDevice,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './DeviceManagement.css';

const EMPTY_FORM = {
  device_uuid: '',
  device_remarks: '',
  group_id: '',
};

export default function DeviceManagement({ onChanged }) {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    try {
      setIsLoading(true);
      const [devicesData, groupsData] = await Promise.all([
        fetchDevices(user),
        fetchGroups(),
      ]);
      setDevices(devicesData);
      setGroups(groupsData);
    } catch (err) {
      setError(err.message || 'Failed to load devices');
    } finally {
      setIsLoading(false);
    }
  }

  function groupName(id) {
    return groups.find((g) => g.id === id)?.group_name ?? '—';
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setSuccessMsg('');
    setShowForm(true);
  }

  function openEdit(d) {
    setEditingId(d.id);
    setForm({
      device_uuid: d.device_uuid,
      device_remarks: d.device_remarks || '',
      group_id: d.group_id ? String(d.group_id) : '',
    });
    setFormError('');
    setSuccessMsg('');
    setShowForm(true);
  }

  function handleFormChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!form.device_uuid.trim()) return setFormError('Device UUID is required.');

    const payload = {
      device_remarks: form.device_remarks.trim(),
      group_id: form.group_id ? Number(form.group_id) : null,
    };

    try {
      setSubmitting(true);
      if (editingId) {
        await updateDevice(editingId, payload);
        setSuccessMsg(`Device "${form.device_uuid}" updated.`);
      } else {
        await createDevice({ device_uuid: form.device_uuid.trim(), ...payload });
        setSuccessMsg(`Device "${form.device_uuid}" created.`);
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await loadAll();
      onChanged?.();
    } catch (err) {
      setFormError(err.message || 'Failed to save device.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(d) {
    if (!window.confirm(`Delete device "${d.device_uuid}" and all its zones? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteDevice(d.id);
      setDevices((prev) => prev.filter((x) => x.id !== d.id));
      setSuccessMsg(`Device "${d.device_uuid}" deleted.`);
      onChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to delete device.');
    }
  }

  return (
    <section className="dm-section">
      <div className="dm-header">
        <div>
          <h3 className="dm-title">Device Management</h3>
          <p className="dm-subtitle">Add, assign and manage all fire-safety devices</p>
        </div>
        <button className="dm-add-btn" onClick={showForm ? () => setShowForm(false) : openCreate}>
          {showForm ? <><span>✕</span> Cancel</> : <><span>+</span> Add Device</>}
        </button>
      </div>

      {successMsg && <div className="dm-alert dm-alert--success">{successMsg}</div>}
      {error && <div className="dm-alert dm-alert--error">{error}</div>}

      {showForm && (
        <div className="dm-form-card">
          <h4 className="dm-form-title">{editingId ? 'Edit Device' : 'New Device'}</h4>
          <div className="dm-form">
            <div className="dm-form-row">
              <div className="dm-field">
                <label className="dm-label">Device UUID</label>
                <input
                  className="dm-input"
                  name="device_uuid"
                  value={form.device_uuid}
                  onChange={handleFormChange}
                  placeholder="e.g. b4e62dd99ff1"
                  disabled={!!editingId}
                  autoComplete="off"
                />
              </div>
              <div className="dm-field">
                <label className="dm-label">Remarks</label>
                <input
                  className="dm-input"
                  name="device_remarks"
                  value={form.device_remarks}
                  onChange={handleFormChange}
                  placeholder="e.g. Office Wifi Add On 1"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="dm-form-row dm-form-row--footer">
              <div className="dm-field">
                <label className="dm-label">Group</label>
                <select className="dm-select" name="group_id" value={form.group_id} onChange={handleFormChange}>
                  <option value="">— No group —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.group_name}</option>
                  ))}
                </select>
              </div>

              <div className="dm-form-actions">
                {formError && <span className="dm-form-error">{formError}</span>}
                <button className="dm-submit-btn" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Create Device'}
                </button>
              </div>
            </div>

            <p className="dm-form-note">
              Status is set automatically: a device shows <strong>Assigned</strong> once
              it is assigned to a user, otherwise <strong>Not assigned</strong>.
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="dm-loading">Loading devices…</div>
      ) : (
        <div className="dm-table-wrap">
          <table className="dm-table">
            <thead>
              <tr>
                <th>Device UUID</th>
                <th>Remarks</th>
                <th>Group</th>
                <th>Status</th>
                <th>Zones</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => (
                <tr key={d.id}>
                  <td className="dm-cell-mono">{d.device_uuid}</td>
                  <td>{d.device_remarks || '—'}</td>
                  <td className="dm-cell-muted">{d.group_name || groupName(d.group_id)}</td>
                  <td>
                    <span className={`dm-status-badge ${d.status === 'ASSIGNED' ? 'badge--on' : 'badge--off'}`}>
                      {(d.status || '').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="dm-cell-muted">{d.summary?.totalZones ?? 0}</td>
                  <td className="dm-cell-actions">
                    <button className="dm-action-btn" onClick={() => openEdit(d)}>Edit</button>
                    <button className="dm-action-btn dm-action-btn--danger" onClick={() => handleDelete(d)}>Delete</button>
                  </td>
                </tr>
              ))}
              {devices.length === 0 && (
                <tr><td colSpan={6} className="dm-empty">No devices found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
