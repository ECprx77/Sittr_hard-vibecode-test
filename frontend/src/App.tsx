import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Role } from '../../shared/types';
import { spacePath, useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage, RegisterPage, SpaceChooserPage } from './pages/AuthPages';
import { BabysitterSpacePage } from './pages/BabysitterSpacePage';
import { ContactPage } from './pages/ContactPage';
import { HomePage } from './pages/HomePage';
import { ParentSpacePage } from './pages/ParentSpacePage';
import { ProfilePage } from './pages/ProfilePage';
import { SearchPage } from './pages/SearchPage';

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="wrap section status-line">Chargement de votre espace…</p>;
  if (!user) {
    return <Navigate to={`/connexion?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  if (user.role !== role) {
    return (
      <div className="wrap section narrow">
        <h1>Cet espace ne correspond pas à votre compte</h1>
        <p>Utilisez l’espace prévu pour votre profil.</p>
        <a className="btn btn-primary" href={spacePath(user.role)}>
          Aller à mon espace
        </a>
      </div>
    );
  }
  return children;
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="recherche" element={<SearchPage />} />
        <Route path="profil/:userId" element={<ProfilePage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="connexion" element={<LoginPage />} />
        <Route path="inscription" element={<RegisterPage />} />
        <Route path="espace" element={<SpaceChooserPage />} />
        <Route
          path="espace/parent"
          element={
            <RequireRole role="parent">
              <ParentSpacePage />
            </RequireRole>
          }
        />
        <Route
          path="espace/baby-sitter"
          element={
            <RequireRole role="babysitter">
              <BabysitterSpacePage />
            </RequireRole>
          }
        />
        <Route
          path="*"
          element={
            <div className="wrap section narrow">
              <h1>Page introuvable</h1>
              <p>Ce lien ne mène nulle part.</p>
              <a className="btn btn-secondary" href="/">
                Revenir à l’accueil
              </a>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
