import { useEffect, useMemo, useState } from 'react';
import {
  fetchUsers,
  createUser,
  toggleUserActive,
  fetchGroups,
  fetchDevices,
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './UserManagement.css';

const ROLES = ['ADMIN', 'FIRE_OFFICER', 'BUILDING_MANAGER', 'VIEWER'];

const ROLE_BADGE = {
  ADMIN: 'role-admin',
  FIRE_OFFICER: 'role-operator',
  BUILDING_MANAGER: 'role-operator',
  VIEWER: 'role-viewer',
};

const EMPTY_FORM = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  first_name: '',
  last_name: '',
  mobile_no: '',
  role: 'VIEWER',
  group_id: '',
  device_id: '',
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    try {
      setIsLoading(true);
      const [usersData, groupsData, devicesData] = await Promise.all([
        fetchUsers(),
        fetchGroups(),
        fetchDevices(currentUser),
      ]);
      setUsers(usersData);
      setGroups(groupsData);
      setDevices(devicesData);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }

  // Devices selectable for the chosen group (the DB trigger requires the
  // assigned device to belong to the same group as the user).
  const devicesForGroup = useMemo(() => {
    if (!form.group_id) return devices;
    return devices.filter((d) => String(d.group_id) === String(form.group_id));
  }, [devices, form.group_id]);

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Changing the group invalidates a device from a different group.
      if (name === 'group_id') next.device_id = '';
      // Selecting a device auto-aligns the group to that device's group.
      if (name === 'device_id' && value) {
        const dev = devices.find((d) => String(d.id) === String(value));
        if (dev && dev.group_id) next.group_id = String(dev.group_id);
      }
      return next;
    });
    setFormError('');
  }

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSuccessMsg('');

    if (!form.username.trim()) return setFormError('Username is required.');
    if (!form.email.trim()) return setFormError('Email is required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setFormError('Enter a valid email.');
    if (form.password.length < 8) return setFormError('Password must be at least 8 characters.');
    if (form.password !== form.confirmPassword) return setFormError('Passwords do not match.');

    try {
      setSubmitting(true);
      await createUser({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        mobile_no: form.mobile_no.trim(),
        group_id: form.group_id ? Number(form.group_id) : null,
        device_id: form.device_id ? Number(form.device_id) : null,
      });
      setSuccessMsg(`User "${form.username}" created successfully.`);
      resetForm();
      setShowForm(false);
      await loadAll();
    } catch (err) {
      setFormError(err.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(u) {
    try {
      await toggleUserActive(u.id, !u.is_active);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: !x.is_active } : x)));
    } catch (err) {
      setError(err.message || 'Failed to update user.');
    }
  }

  return (
    <section className="um-section">
      <div className="um-header">
        <div>
          <h3 className="um-title">User Management</h3>
          <p className="um-subtitle">
            Manage access and roles. A user sees every device in their assigned group.
          </p>
        </div>
        <button
          className="um-add-btn"
          onClick={() => {
            setShowForm((v) => !v);
            setFormError('');
            setSuccessMsg('');
          }}
        >
          {showForm ? <><span>✕</span> Cancel</> : <><span>+</span> Add User</>}
        </button>
      </div>

      {successMsg && <div className="um-alert um-alert--success">{successMsg}</div>}
      {error && <div className="um-alert um-alert--error">{error}</div>}

      {showForm && (
        <div className="um-form-card">
          <h4 className="um-form-title">New User</h4>
          <div className="um-form">
            <div className="um-form-row">
              <div className="um-field">
                <label className="um-label">Username</label>
                <input className="um-input" name="username" value={form.username} onChange={handleFormChange} placeholder="e.g. rajesh.sharma" autoComplete="off" />
              </div>
              <div className="um-field">
                <label className="um-label">Email</label>
                <input className="um-input" name="email" type="email" value={form.email} onChange={handleFormChange} placeholder="e.g. user@company.com" autoComplete="off" />
              </div>
            </div>

            <div className="um-form-row">
              <div className="um-field">
                <label className="um-label">First Name</label>
                <input className="um-input" name="first_name" value={form.first_name} onChange={handleFormChange} placeholder="First name" autoComplete="off" />
              </div>
              <div className="um-field">
                <label className="um-label">Last Name</label>
                <input className="um-input" name="last_name" value={form.last_name} onChange={handleFormChange} placeholder="Last name" autoComplete="off" />
              </div>
            </div>

            <div className="um-form-row">
              <div className="um-field">
                <label className="um-label">Mobile No.</label>
                <input className="um-input" name="mobile_no" value={form.mobile_no} onChange={handleFormChange} placeholder="e.g. 9876543210" autoComplete="off" />
              </div>
              <div className="um-field">
                <label className="um-label">Role</label>
                <select className="um-select" name="role" value={form.role} onChange={handleFormChange}>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="um-form-row">
              <div className="um-field">
                <label className="um-label">Group (grants access to all its devices)</label>
                <select className="um-select" name="group_id" value={form.group_id} onChange={handleFormChange}>
                  <option value="">— No group —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.group_name}</option>
                  ))}
                </select>
              </div>
              <div className="um-field">
                <label className="um-label">Primary Device (optional)</label>
                <select className="um-select" name="device_id" value={form.device_id} onChange={handleFormChange}>
                  <option value="">— No device —</option>
                  {devicesForGroup.map((d) => (
                    <option key={d.id} value={d.id}>
                      {(d.device_remarks || d.device_uuid)} ({d.device_uuid})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="um-form-row">
              <div className="um-field">
                <label className="um-label">Password</label>
                <input className="um-input" name="password" type="password" value={form.password} onChange={handleFormChange} placeholder="Min. 8 characters" />
              </div>
              <div className="um-field">
                <label className="um-label">Confirm Password</label>
                <input className="um-input" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleFormChange} placeholder="Re-enter password" />
              </div>
            </div>

            <div className="um-form-row um-form-row--footer">
              <div />
              <div className="um-form-actions">
                {formError && <span className="um-form-error">{formError}</span>}
                <button className="um-submit-btn" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="um-loading">Loading users…</div>
      ) : (
        <div className="um-table-wrap">
          <table className="um-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Device</th>
                <th>Group</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={!u.is_active ? 'um-row--inactive' : ''}>
                  <td className="um-cell-user">
                    <div className="um-avatar">{u.username.charAt(0).toUpperCase()}</div>
                    <span>{u.username}</span>
                  </td>
                  <td className="um-cell-muted">{u.email}</td>
                  <td>
                    <span className={`um-role-badge ${ROLE_BADGE[u.role] || 'role-viewer'}`}>
                      {(u.role || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="um-cell-muted">{u.device_uuid || '—'}</td>
                  <td className="um-cell-muted">{u.group_name || '—'}</td>
                  <td>
                    <span className={`um-status-dot ${u.is_active ? 'dot--active' : 'dot--inactive'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`um-toggle-btn ${u.is_active ? 'btn--deactivate' : 'btn--activate'}`}
                      onClick={() => handleToggleActive(u)}
                      title={u.is_active ? 'Deactivate user' : 'Activate user'}
                    >
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
