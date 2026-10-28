// src/pages/ResetPassword.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '../components/auth/Toast';
import api from '../services/api';
import './Login.css';

const schema = z.object({
  newPassword: z.string()
    .min(8, 'Must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number')
    .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

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

export default function ResetPassword() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const toast           = useToast();
  const token           = searchParams.get('token');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (!token) { setTokenValid(false); }
    else { setTokenValid(true); }
  }, [token]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: data.newPassword,
      });
      toast.success(
        'Password set successfully',
        'You can now sign in with your new password.'
      );
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      const msg = err?.response?.data?.message
        ?? 'This link is invalid or has expired. Please request a new password reset.';
      toast.error('Unable to set password', msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (tokenValid === false) {
    return (
      <div className="login-container">
        <div className="login-card">
          <LogoMark />
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: '#FEF2F2', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                stroke="#B91C1C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <h1 style={{ fontFamily: 'Playfair Display,serif', fontSize: 20, color: '#0B2B26', marginBottom: 10 }}>
              Invalid Link
            </h1>
            <p style={{ fontSize: 13.5, color: '#666', lineHeight: 1.6, marginBottom: 24 }}>
              This password reset link is invalid or has expired.
              Please contact your administrator to request a new one.
            </p>
            <button className="link-btn" onClick={() => navigate('/login')}>
              ← Back to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <LogoMark />
          <h1>Set your password</h1>
          <p>Choose a strong password to secure your account.</p>
          <div className="login-divider" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label>New Password</label>
            <input
              {...register('newPassword')}
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {errors.newPassword && (
              <span className="error">{errors.newPassword.message}</span>
            )}
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              {...register('confirmPassword')}
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <span className="error">{errors.confirmPassword.message}</span>
            )}
          </div>

          <div style={{
            background: '#F7F4EE', border: '1px solid #E8E4DC',
            borderRadius: 4, padding: '10px 12px', marginBottom: 16,
            fontSize: 12, color: '#888', lineHeight: 1.6,
          }}>
            Password must be at least 8 characters and include an uppercase letter,
            a number, and a special character.
          </div>

          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Setting password…' : 'Set Password →'}
          </button>
        </form>
      </div>
    </div>
  );
}