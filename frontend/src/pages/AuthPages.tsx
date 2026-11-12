import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { spacePath, useAuth } from '../auth/AuthContext';
import { Field, Notice, describedBy } from '../components/ui';
import { validateRegister } from '../lib/validation';

function safeNext(value: string | null, fallback: string): string {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return fallback;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Indiquez votre e-mail et votre mot de passe.');
      return;
    }
    setPending(true);
    try {
      await login(email.trim(), password);
      navigate(safeNext(params.get('next'), '/espace'));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Connexion impossible.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="wrap section narrow">
      <h1>Se connecter</h1>
      <p className="lead">Retrouvez votre espace parent ou baby-sitter.</p>
      <form className="stack" onSubmit={onSubmit}>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Field id="login-email" label="Adresse e-mail">
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field id="login-password" label="Mot de passe">
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
      <p>
        Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
      </p>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialRole = params.get('role') === 'babysitter' ? 'babysitter' : 'parent';
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initialRole);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateRegister({ firstName, email, password, role });
    setErrors(nextErrors);
    setFormError('');
    if (Object.keys(nextErrors).length > 0) return;
    setPending(true);
    try {
      await register({
        firstName: firstName.trim(),
        email: email.trim(),
        password,
        role: role as 'parent' | 'babysitter',
      });
      navigate(role === 'babysitter' ? '/espace/baby-sitter' : '/espace/parent');
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'Inscription impossible.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="wrap section narrow">
      <h1>Créer un compte</h1>
      <p className="lead">Quelques informations suffisent. Vous pourrez compléter votre profil ensuite.</p>
      <form className="stack" onSubmit={onSubmit}>
        {formError ? <Notice tone="error">{formError}</Notice> : null}
        <fieldset className="role-choice">
          <legend>Vous êtes</legend>
          <label className={role === 'parent' ? 'role-option is-selected' : 'role-option'}>
            <input
              type="radio"
              name="role"
              value="parent"
              checked={role === 'parent'}
              onChange={() => setRole('parent')}
            />
            Je cherche une baby-sitter
          </label>
          <label className={role === 'babysitter' ? 'role-option is-selected' : 'role-option'}>
            <input
              type="radio"
              name="role"
              value="babysitter"
              checked={role === 'babysitter'}
              onChange={() => setRole('babysitter')}
            />
            Je propose mes services
          </label>
          {errors.role ? <p className="field-error">Erreur : {errors.role}</p> : null}
        </fieldset>
        <Field id="first-name" label="Prénom" error={errors.firstName}>
          <input
            id="first-name"
            autoComplete="given-name"
            value={firstName}
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={describedBy('first-name', undefined, errors.firstName)}
            onChange={(event) => setFirstName(event.target.value)}
          />
        </Field>
        <Field id="register-email" label="Adresse e-mail" error={errors.email}>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={describedBy('register-email', undefined, errors.email)}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
        <Field
          id="register-password"
          label="Mot de passe"
          hint="8 caractères minimum."
          error={errors.password}
        >
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={describedBy('register-password', 'hint', errors.password)}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>
      <p>
        Déjà inscrit ? <Link to="/connexion">Se connecter</Link>
      </p>
    </div>
  );
}

export function SpaceChooserPage() {
  const { user, loading } = useAuth();
  if (loading) return <p className="wrap section status-line">Chargement de votre espace…</p>;
  if (user?.role === 'admin') {
    return (
      <div className="wrap section narrow">
        <h1>Espace administration</h1>
        <p>La vérification des profils se fait avec le compte administrateur, via l’API.</p>
      </div>
    );
  }
  if (user) return <Navigate to={spacePath(user.role)} replace />;

  return (
    <div className="wrap section">
      <h1>Mon espace</h1>
      <p className="lead">Choisissez la porte qui vous correspond.</p>
      <div className="choice-grid">
        <article className="trust-card">
          <h2>Je suis parent</h2>
          <p>Retrouvez les baby-sitters enregistrées et les demandes envoyées.</p>
          <Link className="btn btn-primary" to="/connexion?next=/espace/parent">
            Entrer
          </Link>
        </article>
        <article className="trust-card">
          <h2>Je suis baby-sitter</h2>
          <p>Présentez-vous, indiquez votre tarif et vos disponibilités.</p>
          <Link className="btn btn-secondary" to="/connexion?next=/espace/baby-sitter">
            Entrer
          </Link>
        </article>
      </div>
    </div>
  );
}
