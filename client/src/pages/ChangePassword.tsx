// src/pages/ChangePassword.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '../components/auth/Toast';
import api from '../services/api';
import './Login.css';

const schema = z.object({
  currentPassword: z.string().min(1, 'Enter your temporary password'),
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

export default function ChangePassword() {
  const navigate    = useNavigate();
  const toast       = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
      });
      toast.success('Password updated', 'Your new password is active.');
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to update password. Please try again.';
      toast.error('Password change failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <LogoMark />
          <h1>Set a new password</h1>
          <p>Your account requires a password change before you can continue.</p>
          <div className="login-divider" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label>Temporary Password</label>
            <input
              {...register('currentPassword')}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {errors.currentPassword && (
              <span className="error">{errors.currentPassword.message}</span>
            )}
          </div>

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
            <label>Confirm New Password</label>
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
            {isLoading ? 'Saving…' : 'Set New Password →'}
          </button>
        </form>
      </div>
    </div>
  );
}