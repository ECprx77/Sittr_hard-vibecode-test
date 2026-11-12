import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicAvailability } from '../../../shared/types';
import {
  ApiError,
  type ContactRequest,
  addAvailability,
  deleteAvailability,
  getMyAvailabilities,
  getProfile,
  getReceivedRequests,
  requestVerification,
  updateProfile,
  updateRequestStatus,
  uploadPhoto,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Notice, VerifiedBadge } from '../components/ui';
import { DAY_OPTIONS, formatDate, formatSlot, requestStatusLabel } from '../lib/format';
import { emptyToNull, validateProfile, validateSlot } from '../lib/validation';

export function BabysitterSpacePage() {
  const { user, applyProfile, logout, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const profile = user?.profile;
  const [form, setForm] = useState({
    firstName: profile?.firstName ?? '',
    age: profile?.age?.toString() ?? '',
    city: profile?.city ?? '',
    postalCode: profile?.postalCode ?? '',
    bio: profile?.bio ?? '',
    experience: profile?.experience ?? '',
    hourlyRate: profile?.hourlyRate?.toString() ?? '',
    phone: profile?.phone ?? '',
    phonePublic: profile?.phonePublic ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slots, setSlots] = useState<PublicAvailability[]>([]);
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('21:00');
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [names, setNames] = useState<Record<number, string>>({});
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setForm({
      firstName: profile.firstName,
      age: profile.age?.toString() ?? '',
      city: profile.city ?? '',
      postalCode: profile.postalCode ?? '',
      bio: profile.bio ?? '',
      experience: profile.experience ?? '',
      hourlyRate: profile.hourlyRate?.toString() ?? '',
      phone: profile.phone ?? '',
      phonePublic: profile.phonePublic,
    });
  }, [profile]);

  useEffect(() => {
    let active = true;
    Promise.all([getMyAvailabilities(), getReceivedRequests()])
      .then(async ([availabilities, received]) => {
        if (!active) return;
        setSlots(availabilities);
        setRequests(received);
        const ids = [...new Set(received.map((item) => item.parentId))];
        const entries = await Promise.all(
          ids.map(async (id) => {
            try {
              const parent = await getProfile(id);
              return [id, parent.firstName] as const;
            } catch {
              return [id, 'Parent'] as const;
            }
          }),
        );
        if (active) setNames(Object.fromEntries(entries));
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof ApiError ? caught.message : 'Chargement impossible.');
      });
    return () => {
      active = false;
    };
  }, []);

  function setField(key: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateProfile({ age: form.age, hourlyRate: form.hourlyRate });
    if (!form.firstName.trim()) nextErrors.firstName = 'Indiquez votre prénom.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setError('');
    try {
      const updated = await updateProfile({
        firstName: form.firstName.trim(),
        age: form.age.trim() ? Number(form.age) : null,
        city: emptyToNull(form.city),
        postalCode: emptyToNull(form.postalCode),
        bio: emptyToNull(form.bio),
        experience: emptyToNull(form.experience),
        hourlyRate: form.hourlyRate.trim() ? Number(form.hourlyRate.replace(',', '.')) : null,
        phone: emptyToNull(form.phone),
        phonePublic: form.phonePublic,
      });
      applyProfile(updated);
      setInfo('Profil enregistré.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Enregistrement impossible.');
    }
  }

  async function onPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = new FormData(event.currentTarget).get('photo');
    if (!(file instanceof File) || file.size === 0) {
      setError('Choisissez une photo.');
      return;
    }
    if (file.size > 1024 * 1024) {
      setError('La photo doit faire moins de 1 Mo.');
      return;
    }
    try {
      applyProfile(await uploadPhoto(file));
      setInfo('Photo mise à jour.');
      setError('');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Envoi de la photo impossible.');
    }
  }

  async function onSlot(event: FormEvent) {
    event.preventDefault();
    const slotError = validateSlot(startTime, endTime);
    if (slotError) {
      setError(slotError);
      return;
    }
    try {
      const created = await addAvailability({
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
      });
      setSlots((current) =>
        [...current, created].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)),
      );
      setInfo('Disponibilité ajoutée.');
      setError('');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Ajout impossible.');
    }
  }

  async function removeSlot(id: number) {
    try {
      await deleteAvailability(id);
      setSlots((current) => current.filter((slot) => slot.id !== id));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Suppression impossible.');
    }
  }

  async function askVerification() {
    try {
      applyProfile(await requestVerification());
      setInfo('Demande de vérification envoyée.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Demande impossible.');
    }
  }

  async function setStatus(id: number, status: ContactRequest['status']) {
    try {
      const updated = await updateRequestStatus(id, status);
      setRequests((current) => current.map((item) => (item.id === id ? updated : item)));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Mise à jour impossible.');
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

  if (!profile) {
    return (
      <div className="wrap section">
        <p className="status-line">Chargement du profil…</p>
      </div>
    );
  }

  return (
    <div className="wrap section">
      <h1>Espace baby-sitter</h1>
      <p className="lead">Bonjour {profile.firstName}. Complétez votre profil pour apparaître dans la recherche.</p>
      <nav className="section-nav" aria-label="Sections du profil">
        <a href="#presentation">Présentation</a>
        <a href="#tarif">Tarif</a>
        <a href="#disponibilites">Disponibilités</a>
        <a href="#demandes">Demandes</a>
      </nav>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {info ? <Notice tone="ok">{info}</Notice> : null}

      <section className="panel" id="presentation">
        <h2>Mon profil</h2>
        {profile.verified ? <VerifiedBadge /> : null}
        <form className="stack" onSubmit={onSave}>
          <div className="field">
            <label htmlFor="sitter-name">Prénom</label>
            <input
              id="sitter-name"
              value={form.firstName}
              onChange={(event) => setField('firstName', event.target.value)}
            />
            {errors.firstName ? <p className="field-error">Erreur : {errors.firstName}</p> : null}
          </div>
          <div className="field">
            <label htmlFor="sitter-age">Âge</label>
            <input
              id="sitter-age"
              inputMode="numeric"
              value={form.age}
              onChange={(event) => setField('age', event.target.value)}
            />
            {errors.age ? <p className="field-error">Erreur : {errors.age}</p> : null}
          </div>
          <div className="field">
            <label htmlFor="sitter-city">Ville</label>
            <input
              id="sitter-city"
              value={form.city}
              onChange={(event) => setField('city', event.target.value)}
            />
            <p className="hint">Écrivez la ville en entier, par exemple Lyon. C’est ce mot qui sert à la recherche.</p>
          </div>
          <div className="field">
            <label htmlFor="sitter-postal">Code postal</label>
            <input
              id="sitter-postal"
              inputMode="numeric"
              value={form.postalCode}
              onChange={(event) => setField('postalCode', event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="sitter-bio">Présentation</label>
            <textarea
              id="sitter-bio"
              rows={4}
              maxLength={2000}
              value={form.bio}
              onChange={(event) => setField('bio', event.target.value)}
            />
            <p className="hint">Quelques phrases suffisent.</p>
          </div>
          <div className="field">
            <label htmlFor="sitter-experience">Expérience</label>
            <textarea
              id="sitter-experience"
              rows={4}
              maxLength={2000}
              value={form.experience}
              onChange={(event) => setField('experience', event.target.value)}
            />
          </div>
          <div className="field" id="tarif">
            <label htmlFor="sitter-rate">Tarif horaire, en euros</label>
            <input
              id="sitter-rate"
              inputMode="decimal"
              value={form.hourlyRate}
              onChange={(event) => setField('hourlyRate', event.target.value)}
            />
            {errors.hourlyRate ? <p className="field-error">Erreur : {errors.hourlyRate}</p> : null}
          </div>
          <div className="field">
            <label htmlFor="sitter-phone">Téléphone</label>
            <input
              id="sitter-phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(event) => setField('phone', event.target.value)}
            />
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              checked={form.phonePublic}
              onChange={(event) => setField('phonePublic', event.target.checked)}
            />
            Afficher mon numéro pour que les parents puissent m’envoyer un SMS.
          </label>
          <button className="btn btn-primary" type="submit">
            Enregistrer
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Photo</h2>
        <form className="stack" onSubmit={onPhoto}>
          <div className="field">
            <label htmlFor="sitter-photo">Image de moins de 1 Mo</label>
            <input id="sitter-photo" name="photo" type="file" accept="image/*" />
          </div>
          <button className="btn btn-secondary" type="submit">
            Envoyer la photo
          </button>
        </form>
      </section>

      <section className="panel" id="disponibilites">
        <h2>Disponibilités</h2>
        {slots.length === 0 ? (
          <p>Aucun créneau pour le moment.</p>
        ) : (
          <ul className="slot-list">
            {slots.map((slot) => (
              <li key={slot.id}>
                <span>{formatSlot(slot)}</span>
                <button className="btn btn-quiet" type="button" onClick={() => removeSlot(slot.id)}>
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
        <form className="filters" onSubmit={onSlot}>
          <div className="field">
            <label htmlFor="slot-day">Jour</label>
            <select id="slot-day" value={dayOfWeek} onChange={(event) => setDayOfWeek(event.target.value)}>
              {DAY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="slot-start">Début</label>
            <input
              id="slot-start"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="slot-end">Fin</label>
            <input id="slot-end" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit">
            Ajouter ce créneau
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Vérification</h2>
        {profile.verified ? (
          <p>Profil vérifié. L’identité a été contrôlée.</p>
        ) : profile.verificationStatus === 'pending' ? (
          <p>Vérification en cours.</p>
        ) : (
          <>
            <p>Profil non vérifié. Vous pouvez demander un contrôle de votre identité.</p>
            <button className="btn btn-secondary" type="button" onClick={askVerification}>
              Demander la vérification
            </button>
          </>
        )}
      </section>

      <section className="panel" id="demandes">
        <h2>Demandes reçues</h2>
        {requests.length === 0 ? (
          <p className="empty">Aucune demande pour le moment.</p>
        ) : (
          <ul className="request-list">
            {requests.map((request) => (
              <li key={request.id}>
                <h3>{names[request.parentId] ?? 'Parent'}</h3>
                <p>
                  Statut : {requestStatusLabel(request.status)} · {formatDate(request.createdAt)}
                </p>
                {request.message ? <p className="pre">{request.message}</p> : null}
                <div className="cta-row">
                  {request.status === 'sent' ? (
                    <button className="btn btn-quiet" type="button" onClick={() => setStatus(request.id, 'seen')}>
                      Marquer comme vue
                    </button>
                  ) : null}
                  {request.status !== 'accepted' && request.status !== 'declined' && request.status !== 'cancelled' ? (
                    <>
                      <button className="btn btn-primary" type="button" onClick={() => setStatus(request.id, 'accepted')}>
                        Accepter
                      </button>
                      <button className="btn btn-secondary" type="button" onClick={() => setStatus(request.id, 'declined')}>
                        Décliner
                      </button>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Compte</h2>
        <button className="btn btn-secondary" type="button" onClick={() => logout().then(() => navigate('/'))}>
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
            Je confirme la suppression de mon compte.
          </label>
          <button className="btn btn-quiet" type="submit">
            Supprimer définitivement
          </button>
        </form>
      </section>
    </div>
  );
}
