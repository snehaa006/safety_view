import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { changePassword, fetchAlertPreferences, setAlertPreferences } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PasswordInput } from '@/components/ui/password-input';
import type { UserAlertPreference } from '@/types';

const APP_NAME_KEY = 'sv_app_name';
const APP_LOGO_KEY = 'sv_app_logo';

export default function SettingsPage() {
  const { user } = useAuth();

  // password
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwErr, setPwErr] = useState('');
  const [pwOk, setPwOk] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  // branding (super admin only)
  const isSuperAdmin = user?.roles?.includes('Super Admin');
  const [appName, setAppName] = useState(() => localStorage.getItem(APP_NAME_KEY) || '');
  const [appLogo, setAppLogo] = useState(() => localStorage.getItem(APP_LOGO_KEY) || '');
  const [brandingMsg, setBrandingMsg] = useState('');

  function saveBranding() {
    if (appName.trim()) localStorage.setItem(APP_NAME_KEY, appName.trim());
    else localStorage.removeItem(APP_NAME_KEY);
    if (appLogo.trim()) localStorage.setItem(APP_LOGO_KEY, appLogo.trim());
    else localStorage.removeItem(APP_LOGO_KEY);
    window.dispatchEvent(new Event('sv_branding_update'));
    setBrandingMsg('Branding saved.');
    setTimeout(() => setBrandingMsg(''), 3000);
  }

  // alert prefs
  const [prefs, setPrefs] = useState<UserAlertPreference[]>([]);
  const [prefBusy, setPrefBusy] = useState(false);
  const [prefMsg, setPrefMsg] = useState('');

  useEffect(() => {
    (async () => {
      if (user?.id != null) setPrefs(await fetchAlertPreferences(user.id).catch(() => []));
    })();
  }, [user]);

  async function submitPassword() {
    setPwErr(''); setPwOk('');
    if (!current) return setPwErr('Enter your current password.');
    if (next.length < 8) return setPwErr('New password must be at least 8 characters.');
    if (next !== confirm) return setPwErr('Passwords do not match.');
    if (!user) return;
    try {
      setPwBusy(true);
      await changePassword(user.id, current, next);
      setPwOk('Password changed.'); setCurrent(''); setNext(''); setConfirm('');
    } catch (err) { setPwErr(err instanceof Error ? err.message : 'Failed to change password.'); }
    finally { setPwBusy(false); }
  }

  function addPref() {
    setPrefs((p) => [...p, { alert_type: null, severity_level: null, channel: 'EMAIL', destination: '', is_enabled: true }]);
  }
  function setPref(i: number, patch: Partial<UserAlertPreference>) {
    setPrefs((p) => p.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function removePref(i: number) { setPrefs((p) => p.filter((_, idx) => idx !== i)); }

  async function savePrefs() {
    if (!user) return;
    setPrefMsg('');
    try {
      setPrefBusy(true);
      await setAlertPreferences(user.id, prefs);
      setPrefMsg('Alert preferences saved.');
    } catch (err) { setPrefMsg(err instanceof Error ? err.message : 'Failed to save preferences.'); }
    finally { setPrefBusy(false); }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div>
        <h3 className="text-lg font-bold">Settings</h3>
        <p className="text-sm text-muted-foreground">Manage your account</p>
      </div>

      {isSuperAdmin && (
        <Card className="p-6">
          <h4 className="mb-4 font-semibold">App Branding</h4>
          <p className="mb-4 text-xs text-muted-foreground">Customize the app name and logo shown in the sidebar. Changes are stored locally in this browser.</p>
          {brandingMsg && <div className="mb-4 rounded-md border border-ok-border bg-ok-bg px-3 py-2 text-sm text-ok-text">{brandingMsg}</div>}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>App Name</Label>
              <Input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="SafetyView" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Logo URL</Label>
              <Input value={appLogo} onChange={(e) => setAppLogo(e.target.value)} placeholder="https://…/logo.png" />
              {appLogo && <img src={appLogo} alt="Logo preview" className="h-10 w-auto rounded border border-border object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />}
            </div>
            <div className="flex justify-end"><Button onClick={saveBranding}>Save Branding</Button></div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h4 className="mb-4 font-semibold">Change Password</h4>
        {pwOk && <div className="mb-4 rounded-md border border-ok-border bg-ok-bg px-3 py-2 text-sm text-ok-text">{pwOk}</div>}
        {pwErr && <div className="mb-4 rounded-md border border-crit-border bg-crit-bg px-3 py-2 text-sm text-crit-text">{pwErr}</div>}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5"><Label>Current Password</Label><PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
          <div className="flex flex-col gap-1.5"><Label>New Password</Label><PasswordInput value={next} onChange={(e) => setNext(e.target.value)} placeholder="Min. 8 characters" /></div>
          <div className="flex flex-col gap-1.5"><Label>Confirm New Password</Label><PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
          <div className="flex justify-end"><Button onClick={submitPassword} disabled={pwBusy}>{pwBusy ? 'Saving…' : 'Change Password'}</Button></div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h4 className="font-semibold">Alert Preferences</h4>
          <Button variant="outline" size="sm" onClick={addPref}><Plus className="h-4 w-4" /> Add rule</Button>
        </div>
        {prefMsg && <div className="mb-4 rounded-md border border-ok-border bg-ok-bg px-3 py-2 text-sm text-ok-text">{prefMsg}</div>}
        {prefs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No routing rules. Add one to receive alerts via email/SMS/etc.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {prefs.map((p, i) => (
              <div key={i} className="grid grid-cols-1 items-end gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
                <div className="flex flex-col gap-1"><Label>Channel</Label><Input value={p.channel} onChange={(e) => setPref(i, { channel: e.target.value })} placeholder="EMAIL / SMS / PUSH" /></div>
                <div className="flex flex-col gap-1"><Label>Destination</Label><Input value={p.destination} onChange={(e) => setPref(i, { destination: e.target.value })} placeholder="address / number" /></div>
                <div className="flex flex-col gap-1"><Label>Severity</Label><Input value={p.severity_level || ''} onChange={(e) => setPref(i, { severity_level: e.target.value || null })} placeholder="any" /></div>
                <label className="flex items-center gap-2 pb-2 text-sm"><Checkbox checked={p.is_enabled} onCheckedChange={(v) => setPref(i, { is_enabled: v === true })} /> On</label>
                <Button variant="ghost" size="icon" onClick={() => removePref(i)}><Trash2 className="h-4 w-4 text-crit-text" /></Button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end"><Button onClick={savePrefs} disabled={prefBusy}>{prefBusy ? 'Saving…' : 'Save Preferences'}</Button></div>
      </Card>
    </section>
  );
}
