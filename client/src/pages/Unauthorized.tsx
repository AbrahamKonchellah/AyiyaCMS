// src/pages/Unauthorized.tsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="unauthorized-container">
      <h1>403</h1>
      <h2>Access Denied</h2>
      <p>You don't have permission to view this page.</p>
      <p>Your role: <strong>{user?.role}</strong></p>
      <button onClick={() => navigate('/dashboard')}>
        Go to Dashboard
      </button>
    </div>
  );
}