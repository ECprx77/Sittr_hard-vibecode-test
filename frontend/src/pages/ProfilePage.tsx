import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { PublicProfile } from '../../../shared/types';
import {
  ApiError,
  addFavorite,
  createRequest,
  getFavorites,
  getProfile,
  removeFavorite,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { MessageIcon } from '../components/Icons';
import { Avatar, Notice, VerifiedBadge } from '../components/ui';
import {
  ageLabel,
  formatSlot,
  placeLabel,
  rateLabel,
  smsBody,
  smsHref,
} from '../lib/format';

export function ProfilePage() {
  const params = useParams();
  const userId = Number(params.userId);
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('Bonjour, je cherche une baby-sitter. Êtes-vous disponible ?');
  const [feedback, setFeedback] = useState('');
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    setError('');
    setProfile(null);
    if (!Number.isInteger(userId)) {
      setError('Ce profil est introuvable.');
      return;
    }
    getProfile(userId)
      .then((next) => {
        if (active) setProfile(next);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof ApiError ? caught.message : 'Ce profil est introuvable.');
      });
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (user?.role !== 'parent' || !Number.isInteger(userId)) return;
    let active = true;
    getFavorites()
      .then((favorites) => {
        if (active) setSaved(favorites.some((item) => item.userId === userId));
      })
      .catch(() => {
        if (active) setSaved(false);
      });
    return () => {
      active = false;
    };
  }, [user, userId]);

  async function toggleSaved() {
    setFormError('');
    try {
      if (saved) {
        await removeFavorite(userId);
        setSaved(false);
        setFeedback('Profil retiré de vos baby-sitters enregistrées.');
      } else {
        await addFavorite(userId);
        setSaved(true);
        setFeedback('Profil enregistré. Vous le retrouverez dans votre espace.');
      }
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'Enregistrement impossible.');
    }
  }

  async function onRequest(event: FormEvent) {
    event.preventDefault();
    setFormError('');
    setSending(true);
    try {
      await createRequest(userId, message.trim());
      setFeedback('Demande envoyée. Vous la retrouverez dans votre espace.');
    } catch (caught) {
      setFormError(caught instanceof ApiError ? caught.message : 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  }

  if (error) {
    return (
      <div className="wrap section">
        <Notice tone="error">{error}</Notice>
        <Link className="btn btn-secondary" to="/recherche">
          Retour à la recherche
        </Link>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="wrap section">
        <p className="status-line">Chargement du profil…</p>
      </div>
    );
  }

  const slots = profile.availabilities ?? [];
  const phoneReady = Boolean(profile.phone);
  const next = encodeURIComponent(`/profil/${profile.userId}`);

  return (
    <div className="wrap section profile-page">
      <Link className="back-link" to="/recherche">
        Retour aux profils
      </Link>
      <header className="profile-head">
        <Avatar profile={profile} large />
        <div>
          <h1>{profile.firstName}</h1>
          <p>{ageLabel(profile.age)}</p>
          <p>{placeLabel(profile.city, profile.postalCode)}</p>
          {profile.verified ? <VerifiedBadge /> : null}
        </div>
      </header>

      <section className="contact-box" aria-labelledby="contact-title">
        <h2 id="contact-title">Contacter {profile.firstName}</h2>
        {phoneReady && profile.phone ? (
          <a className="btn btn-primary btn-block" href={smsHref(profile.phone, smsBody(profile.firstName))}>
            <MessageIcon />
            Contacter par SMS
          </a>
        ) : (
          <p>Le numéro n’est pas public. Envoyez une demande pour être recontacté.</p>
        )}
        {feedback ? <Notice tone="ok">{feedback}</Notice> : null}
        {formError ? <Notice tone="error">{formError}</Notice> : null}
        {user?.role === 'parent' ? (
          <>
            <button className="btn btn-secondary btn-block" type="button" onClick={toggleSaved}>
              {saved ? 'Retirer des enregistrées' : 'Enregistrer cette baby-sitter'}
            </button>
            <form className="stack" onSubmit={onRequest}>
              <div className="field">
                <label htmlFor="request-message">Votre message</label>
                <textarea
                  id="request-message"
                  value={message}
                  maxLength={1000}
                  rows={3}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </div>
              <button className="btn btn-primary btn-block" type="submit" disabled={sending}>
                {phoneReady ? 'Envoyer aussi une demande' : 'Envoyer une demande'}
              </button>
            </form>
          </>
        ) : (
          <p>
            <Link to={`/connexion?next=${next}`}>Connectez-vous</Link> pour enregistrer ce profil ou
            envoyer une demande.
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Présentation</h2>
        <p className="pre">{profile.bio?.trim() || 'Aucune présentation pour le moment.'}</p>
      </section>
      <section className="panel">
        <h2>Expérience</h2>
        <p className="pre">{profile.experience?.trim() || 'Aucune expérience renseignée.'}</p>
      </section>
      <section className="panel">
        <h2>Tarif</h2>
        <p>{rateLabel(profile.hourlyRate)}</p>
      </section>
      <section className="panel">
        <h2>Disponibilités</h2>
        {slots.length === 0 ? (
          <p>Aucune disponibilité renseignée.</p>
        ) : (
          <ul className="chip-list">
            {slots.map((slot) => (
              <li className="chip" key={slot.id}>
                {formatSlot(slot)}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="panel">
        <h2>Avis</h2>
        <p>Aucun avis pour le moment. Appuyez-vous sur la vérification du profil et sur la permanence.</p>
      </section>
      <section className="panel">
        <h2>Vérification</h2>
        <p>
          {profile.verified
            ? 'Profil vérifié. L’identité a été contrôlée.'
            : profile.verificationStatus === 'pending'
              ? 'Vérification en cours. L’identité n’est pas encore confirmée.'
              : 'Profil non vérifié. L’identité n’a pas encore été contrôlée.'}
        </p>
      </section>
    </div>
  );
}
