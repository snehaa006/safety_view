import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Flame, CheckCircle2 } from 'lucide-react';
import { resetPasswordByIdentity } from '@/services/api';
import { useAppSettings } from '@/context/AppSettingsContext';
import { validateNewPassword } from '@/lib/password';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';

export default function ForgotPasswordPage() {
  const { appName, logoData } = useAppSettings();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const validationError = validateNewPassword(newPassword, confirmPassword);
    if (validationError) return setError(validationError);
    setIsSubmitting(true);
    try {
      await resetPasswordByIdentity(username.trim(), email.trim(), newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-md">
        <div className="mb-6 flex items-center gap-3">
          {logoData ? (
            <img src={logoData} alt="Logo" className="h-12 w-12 rounded-md object-contain" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-md border border-fire-border bg-fire-bg">
              <Flame className="h-6 w-6 text-fire-strong" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold tracking-tight">{appName}</h1>
            <p className="text-sm text-muted-foreground">Reset your password</p>
          </div>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-10 w-10 text-ok-text" />
            <p className="text-sm">Your password has been updated. You can sign in with it now.</p>
            <Link to="/login" className="mt-2 text-sm font-medium text-accent hover:underline">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Enter the username and email on your account, then choose a new password.
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fp-username">Username</Label>
              <Input id="fp-username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fp-email">Email</Label>
              <Input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fp-new">New Password</Label>
              <PasswordInput id="fp-new" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fp-confirm">Confirm New Password</Label>
              <PasswordInput id="fp-confirm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
            </div>

            {error && (
              <div className="rounded-md border border-crit-border bg-crit-bg px-3 py-2 text-sm text-crit-text" role="alert">
                {error}
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? 'Resetting…' : 'Reset Password'}
            </Button>

            <Link to="/login" className="text-center text-sm font-medium text-muted-foreground hover:text-foreground">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
