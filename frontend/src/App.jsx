import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginPage    from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage     from './pages/ChatPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import useAuthStore from './store/useAuthStore';

const App = () => {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1c1c28',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            fontSize: '13px',
            fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
          },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />

      <div className="h-screen w-screen overflow-hidden">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/" replace /> : <RegisterPage />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
