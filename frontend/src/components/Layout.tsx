import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth, spacePath } from '../auth/AuthContext';
import { formatPhone, telHref } from '../lib/format';
import { HomeIcon, PhoneIcon, SearchIcon, UserIcon } from './Icons';

const links = [
  { to: '/', label: 'Accueil', end: true, icon: HomeIcon },
  { to: '/recherche', label: 'Trouver', end: false, icon: SearchIcon },
  { to: '/espace', label: 'Espace', end: false, icon: UserIcon },
  { to: '/contact', label: 'Contact', end: true, icon: PhoneIcon },
];

export function Layout() {
  const { user, config } = useAuth();
  const phone = formatPhone(config.supportPhone);
  const callLabel = `Appeler la permanence au ${phone}`;

  return (
    <>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/">
            sittr
          </Link>
          <nav className="header-nav" aria-label="Navigation principale">
            <NavLink to="/" end>
              Accueil
            </NavLink>
            <NavLink to="/recherche">Trouver</NavLink>
            <NavLink to="/contact">Contact</NavLink>
          </nav>
          <div className="header-tools">
            <a className="phone-link" href={telHref(config.supportPhone)} aria-label={callLabel}>
              <PhoneIcon />
              <span className="phone-link-text">{phone}</span>
            </a>
            {user ? (
              <Link className="btn btn-quiet header-account" to={spacePath(user.role)}>
                Mon espace
              </Link>
            ) : (
              <Link className="btn btn-quiet header-account" to="/connexion">
                Se connecter
              </Link>
            )}
          </div>
        </div>
      </header>
      <main id="contenu" className="page">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="wrap footer-inner">
          <p className="brand">sittr</p>
          <p>Mise en relation entre parents et baby-sitters.</p>
          <p>
            Permanence, tous les jours de 8 h à 22 h :{' '}
            <a href={telHref(config.supportPhone)}>{phone}</a>
          </p>
        </div>
      </footer>
      <nav className="bottom-nav" aria-label="Navigation">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink key={link.to} to={link.to} end={link.end}>
              <Icon />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}
