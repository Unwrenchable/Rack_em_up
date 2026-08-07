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
import { TournamentsListPage } from './pages/TournamentsListPage';
import { TournamentsPage } from './pages/TournamentsPage';
import { TournamentTvPage } from './pages/TournamentTvPage';
import { ShotsCatalogPage } from './pages/ShotsCatalogPage';
import { MoneyPage } from './pages/MoneyPage';
import { ScorekeepingPage } from './pages/ScorekeepingPage';
import { PyramidPage } from './pages/PyramidPage';
import { WalletPage } from './pages/WalletPage';

function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      {/* Public TV board — no shell / no auth for hall displays */}
      <Route path="tournaments/:id/tv" element={<TournamentTvPage />} />

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
        <Route path="money" element={<MoneyPage />} />
        <Route path="social" element={<SocialPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="halls" element={<HallsPage />} />
        <Route path="coach" element={<CoachPage />} />
        <Route path="shots" element={<ShotsCatalogPage />} />
        <Route path="memories" element={<MemoriesPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="wallet" element={<WalletPage />} />

        <Route path="tournaments" element={<TournamentsListPage />} />
        <Route path="tournaments/:id" element={<TournamentsPage />} />
        <Route path="scorekeeping" element={<ScorekeepingPage />} />
        <Route path="pyramid" element={<PyramidPage />} />
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