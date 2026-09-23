'use client';
import { useState, type FormEvent } from 'react';
import { useT } from '@/hooks/useT';
import { firebaseEnabled } from '@/services/firebase';
import { authErrorKey, resetPassword, signInEmail } from '@/services/auth';
import type { I18nKey } from '@/utils/i18n';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Controls';
import { AuthShell, AuthSwitch } from '@/components/auth/AuthShell';

export default function LoginPage() {
  const t = useT();
  const [forgot, setForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<I18nKey | null>(null);
  const [info, setInfo] = useState<I18nKey | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (forgot) {
        await resetPassword(email);
        setInfo('auth.resetSent');
      } else {
        await signInEmail(email, password);
      }
    } catch (err) {
      setError(authErrorKey(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title={forgot ? t('auth.forgot') : t('auth.login')}>
      {firebaseEnabled && (
        <>
          <form onSubmit={(e) => void submit(e)} className="space-y-3">
            <Field label={t('auth.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            {!forgot && (
              <Field
                label={t('auth.password')}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="current-password"
              />
            )}
            {error && <p className="text-sm text-laterite">{t(error)}</p>}
            {info && <p className="text-sm text-leaf">{t(info)}</p>}
            <Button type="submit" full size="lg" loading={busy}>
              {forgot ? t('auth.sendReset') : t('auth.login')}
            </Button>
          </form>
          <div className="mt-1 text-center">
            <button
              type="button"
              className="h-10 text-sm text-rain hover:text-paper"
              onClick={() => {
                setForgot(!forgot);
                setError(null);
                setInfo(null);
              }}
            >
              {forgot ? t('auth.backToLogin') : t('auth.forgot')}
            </button>
          </div>
        </>
      )}
      <AuthSwitch prompt={t('auth.noAccount')} action={t('auth.register')} href="/register" />
    </AuthShell>
  );
}
