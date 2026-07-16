import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth-context';
import { ToastProvider } from './lib/toast-context';
import { Layout } from './components/Layout';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { FindPage } from './pages/FindPage';
import { PlayPage } from './pages/PlayPage';
import { SocialPage } from './pages/SocialPage';
import { MemoriesPage } from './pages/MemoriesPage';
import { ProfilePage } from './pages/ProfilePage';
import { ChatPage } from './pages/ChatPage';
import { HallsPage } from './pages/HallsPage';
import { CoachPage } from './pages/CoachPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotificationsPage } from './pages/NotificationsPage';

function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="find" element={<FindPage />} />
        <Route path="play" element={<PlayPage />} />
        <Route path="money" element={<Navigate to="/play" replace />} />
        <Route path="social" element={<SocialPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="halls" element={<HallsPage />} />
        <Route path="coach" element={<CoachPage />} />
        <Route path="memories" element={<MemoriesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}