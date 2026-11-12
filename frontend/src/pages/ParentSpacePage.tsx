import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { PublicProfile } from '../../../shared/types';
import {
  ApiError,
  type ContactRequest,
  getFavorites,
  getProfile,
  getSentRequests,
  removeFavorite,
  updateRequestStatus,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ProfileCard } from '../components/ProfileCard';
import { Notice } from '../components/ui';
import { formatDate, placeLabel, requestStatusLabel, smsHref, telHref } from '../lib/format';

export function ParentSpacePage() {
  const { user, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<PublicProfile[]>([]);
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [people, setPeople] = useState<Record<number, PublicProfile>>({});
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getFavorites(), getSentRequests()])
      .then(async ([saved, sent]) => {
        if (!active) return;
        setFavorites(saved);
        setRequests(sent);
        const ids = [...new Set(sent.map((item) => item.babysitterId))];
        const entries = await Promise.all(
          ids.map(async (id) => {
            try {
              return [id, await getProfile(id)] as const;
            } catch {
              return null;
            }
          }),
        );
        if (!active) return;
        setPeople(Object.fromEntries(entries.filter((entry) => entry !== null)));
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof ApiError ? caught.message : 'Chargement impossible.');
      });
    return () => {
      active = false;
    };
  }, []);

  async function unsave(id: number) {
    try {
      await removeFavorite(id);
      setFavorites((current) => current.filter((item) => item.userId !== id));
      setInfo('Baby-sitter retirée de votre liste.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Retrait impossible.');
    }
  }

  async function cancelRequest(id: number) {
    try {
      const updated = await updateRequestStatus(id, 'cancelled');
      setRequests((current) => current.map((item) => (item.id === id ? updated : item)));
      setInfo('Demande annulée.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Annulation impossible.');
    }
  }

  async function onDelete(event: FormEvent) {
    event.preventDefault();
    if (!confirmDelete) {
      setError('Cochez la confirmation avant de supprimer le compte.');
      return;
    }
    try {
      await deleteAccount();
      navigate('/');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Suppression impossible.');
    }
  }

  return (
    <div className="wrap section">
      <h1>Espace parent</h1>
      <p className="lead">Bonjour {user?.profile?.firstName ?? ''}. Voici ce que vous avez gardé.</p>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {info ? <Notice tone="ok">{info}</Notice> : null}

      <p>
        <Link className="btn btn-primary" to="/recherche">
          Consulter les profils
        </Link>
      </p>

      <section className="panel">
        <h2>Baby-sitters enregistrées</h2>
        {favorites.length === 0 ? (
          <p className="empty">Aucune baby-sitter enregistrée pour le moment.</p>
        ) : (
          <div className="card-list">
            {favorites.map((profile) => (
              <div key={profile.userId} className="stack">
                <ProfileCard profile={profile} />
                <button className="btn btn-quiet" type="button" onClick={() => unsave(profile.userId)}>
                  Retirer {profile.firstName}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Demandes envoyées</h2>
        {requests.length === 0 ? (
          <p className="empty">Vous n’avez pas encore envoyé de demande.</p>
        ) : (
          <ul className="request-list">
            {requests.map((request) => {
              const person = people[request.babysitterId];
              return (
                <li key={request.id}>
                  <h3>{person?.firstName ?? 'Baby-sitter'}</h3>
                  <p>{person ? placeLabel(person.city, person.postalCode) : 'Profil indisponible'}</p>
                  <p>
                    Statut : {requestStatusLabel(request.status)} · {formatDate(request.createdAt)}
                  </p>
                  {request.message ? <p className="pre">{request.message}</p> : null}
                  <div className="cta-row">
                    <Link className="btn btn-secondary" to={`/profil/${request.babysitterId}`}>
                      Voir le profil
                    </Link>
                    {person?.phone ? (
                      <>
                        <a className="btn btn-quiet" href={telHref(person.phone)}>
                          Appeler
                        </a>
                        <a className="btn btn-quiet" href={smsHref(person.phone, `Bonjour ${person.firstName}`)}>
                          SMS
                        </a>
                      </>
                    ) : (
                      <p>Numéro non public.</p>
                    )}
                    {request.status !== 'cancelled' && request.status !== 'declined' ? (
                      <button className="btn btn-quiet" type="button" onClick={() => cancelRequest(request.id)}>
                        Annuler la demande
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Compte</h2>
        <p>{user?.email}</p>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => logout().then(() => navigate('/'))}
        >
          Se déconnecter
        </button>
        <form className="danger-zone" onSubmit={onDelete}>
          <h3>Supprimer mon compte</h3>
          <label>
            <input
              type="checkbox"
              checked={confirmDelete}
              onChange={(event) => setConfirmDelete(event.target.checked)}
            />
            Je confirme la suppression de mon compte et de mes demandes.
          </label>
          <button className="btn btn-quiet" type="submit">
            Supprimer définitivement
          </button>
        </form>
      </section>
    </div>
  );
}
