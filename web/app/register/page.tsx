'use client';
import { useState, type FormEvent } from 'react';
import { GAME } from '@nizhal/shared';
import { useT } from '@/hooks/useT';
import { firebaseEnabled } from '@/services/firebase';
import { authErrorKey, registerEmail } from '@/services/auth';
import type { I18nKey } from '@/utils/i18n';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Controls';
import { Notice } from '@/components/ui/Feedback';
import { AuthShell, AuthSwitch } from '@/components/auth/AuthShell';

export default function RegisterPage() {
  const t = useT();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<I18nKey | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < GAME.MIN_NAME_LENGTH) return setError('auth.err.name');
    if (password.length < 6) return setError('auth.err.weak');
    if (password !== confirm) return setError('auth.err.mismatch');
    setBusy(true);
    try {
      await registerEmail(email, password, name.trim());
    } catch (err) {
      setError(authErrorKey(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title={t('auth.register')}>
      {firebaseEnabled ? (
        <form onSubmit={(e) => void submit(e)} className="space-y-3">
          <Field
            label={t('auth.displayName')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={GAME.MAX_NAME_LENGTH}
            required
            autoComplete="nickname"
          />
          <Field label={t('auth.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('auth.password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
            <Field label={t('auth.confirmPassword')} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} autoComplete="new-password" />
          </div>
          {error && <Notice tone="danger">{t(error)}</Notice>}
          <Button type="submit" variant="gold" full size="lg" loading={busy}>
            {t('auth.register')}
          </Button>
        </form>
      ) : (
        <p className="text-sm text-mist">{t('auth.registerUnavailable')}</p>
      )}
      <AuthSwitch prompt={t('auth.haveAccount')} action={t('auth.login')} href="/login" />
    </AuthShell>
  );
}
