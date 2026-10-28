// src/pages/Login.tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import './Login.css';

const loginSchema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const mfaSchema = z.object({
  code: z.string().length(6, 'Code must be exactly 6 digits'),
});

type LoginForm = z.infer<typeof loginSchema>;
type MfaForm  = z.infer<typeof mfaSchema>;

const LogoMark = () => (
  <div className="login-logo">
    <div className="login-logo-mark">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4A853" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75
             M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0
             c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202
             a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352
             c-.483-.174-.711-.703-.59-1.202L18.75 4.97Zm-16.5.52
             c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202
             a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352
             c-.483-.174-.711-.703-.59-1.202L5.25 5.49Z" />
      </svg>
    </div>
    <span className="login-logo-name">AyiyaCMS</span>
  </div>
);

export default function Login() {
  const { login, verifyMfa } = useAuth();
  const navigate = useNavigate();
  const [mfaRequired, setMfaRequired] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const mfaForm   = useForm<MfaForm>({ resolver: zodResolver(mfaSchema) });

  const handleLogin = async (data: LoginForm) => {
    setIsLoading(true);
    setError('');
    try {
      const result = await login(data.email, data.password);

      if (result.passwordExpired) {
        setError('Your temporary password has expired. Please contact your administrator.');
        return;
      }
      if (result.mfaRequired) {
        setPendingEmail(data.email);
        setMfaRequired(true);
        return;
      }
      if (result.mustChangePassword) {
        navigate('/change-password');
        return;
      }
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfa = async (data: MfaForm) => {
    setIsLoading(true);
    setError('');
    try {
      const result = await verifyMfa(pendingEmail, data.code);
      if (result?.mustChangePassword) {
        navigate('/change-password');
        return;
      }
      navigate('/dashboard');
    } catch {
      setError('Invalid or expired code. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── MFA Screen ─────────────────────────────────────
  if (mfaRequired) {
    return (
      <div className="login-container">
        <div className="login-card">
          <LogoMark />
          <h1>Two-Factor Authentication</h1>
          <p>Enter the 6-digit code from your authenticator app.</p>
          <form onSubmit={mfaForm.handleSubmit(handleMfa)} noValidate>
            <div className="form-group">
              <label>Authentication Code</label>
              <input
                {...mfaForm.register('code')}
                placeholder="000000"
                maxLength={6}
                autoComplete="one-time-code"
              />
              {mfaForm.formState.errors.code && (
                <span className="error">{mfaForm.formState.errors.code.message}</span>
              )}
            </div>
            {error && <div className="error-banner">{error}</div>}
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>
            <button type="button" className="link-btn" onClick={() => setMfaRequired(false)}>
              ← Back to login
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Login Screen ────────────────────────────────────
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <LogoMark />
          <h1>Sign in to your firm</h1>
          <p>Law Practice Management System</p>
          <div className="login-divider" />
        </div>
        <form onSubmit={loginForm.handleSubmit(handleLogin)} noValidate>
          <div className="form-group">
            <label>Email Address</label>
            <input
              {...loginForm.register('email')}
              type="email"
              placeholder="you@lawfirm.co.ke"
              autoComplete="email"
            />
            {loginForm.formState.errors.email && (
              <span className="error">{loginForm.formState.errors.email.message}</span>
            )}
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              {...loginForm.register('password')}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {loginForm.formState.errors.password && (
              <span className="error">{loginForm.formState.errors.password.message}</span>
            )}
          </div>
          {error && <div className="error-banner">{error}</div>}
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  );
}