// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './store/AuthContext'
import App from './App'
import './index.css'
import { ToastProvider } from './components/auth/Toast';
import { ConfirmProvider } from './components/auth/ConfirmDialog';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
      <ToastProvider>
       <ConfirmProvider>
         <App />
       </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)