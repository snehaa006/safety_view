import { useState } from 'react';
import { changePassword } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';

type Errors = { current?: string; next?: string; confirm?: string };

export default function SettingsPage() {
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [submitError, setSubmitError] = useState('');

  function clearErr(key: keyof Errors) {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
    setSubmitError('');
    setSuccess('');
  }

  async function handleSubmit() {
    const e: Errors = {};
    if (!current) e.current = 'Enter your current password.';
    if (next.length < 8) e.next = 'New password must be at least 8 characters.';
    if (next !== confirm) e.confirm = 'Passwords do not match.';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    if (!user) return;
    try {
      setSubmitting(true);
      await changePassword(user.id, current, next);
      setSuccess('Password changed successfully.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to change password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl space-y-4">
      <div>
        <h3 className="text-lg font-bold">Settings</h3>
        <p className="text-sm text-muted-foreground">Manage your account</p>
      </div>

      <Card className="p-6">
        <h4 className="mb-4 font-semibold">Change Password</h4>

        {success && (
          <div className="mb-4 rounded-md border border-ok-border bg-ok-bg px-3 py-2 text-sm text-ok-text">{success}</div>
        )}
        {submitError && (
          <div className="mb-4 rounded-md border border-crit-border bg-crit-bg px-3 py-2 text-sm text-crit-text">{submitError}</div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Current Password</Label>
            <PasswordInput value={current} onChange={(e) => { setCurrent(e.target.value); clearErr('current'); }} />
            {errors.current && <span className="text-xs font-medium text-crit-text">{errors.current}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>New Password</Label>
            <PasswordInput value={next} onChange={(e) => { setNext(e.target.value); clearErr('next'); }} placeholder="Min. 8 characters" />
            {errors.next && <span className="text-xs font-medium text-crit-text">{errors.next}</span>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Confirm New Password</Label>
            <PasswordInput value={confirm} onChange={(e) => { setConfirm(e.target.value); clearErr('confirm'); }} />
            {errors.confirm && <span className="text-xs font-medium text-crit-text">{errors.confirm}</span>}
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Change Password'}
            </Button>
          </div>
        </div>
      </Card>
    </section>
  );
}
