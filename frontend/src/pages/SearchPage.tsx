import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError, searchProfiles } from '../api/client';
import { ProfileCard } from '../components/ProfileCard';
import { Notice } from '../components/ui';
import {
  DAY_OPTIONS,
  RATE_OPTIONS,
  WHEN_OPTIONS,
  buildSearchParams,
  whenFromRange,
  type TimePreset,
} from '../lib/format';
import type { PublicProfile } from '../../../shared/types';

export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const place = params.get('city') || params.get('postalCode') || '';
  const maxRate = params.get('maxRate') ?? '';
  const day = params.get('day') ?? '';
  const when = whenFromRange(params.get('after'), params.get('before'));
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    searchProfiles(new URLSearchParams(query))
      .then((profiles) => {
        if (active) setResults(profiles);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setResults([]);
        setError(caught instanceof ApiError ? caught.message : 'La recherche a échoué.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [query]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = buildSearchParams({
      place: String(data.get('place') ?? ''),
      maxRate: String(data.get('maxRate') ?? ''),
      day: String(data.get('day') ?? ''),
      when: String(data.get('when') ?? '') as TimePreset,
    });
    setParams(next);
  }

  const countLabel =
    results.length === 0
      ? 'Aucun profil'
      : results.length === 1
        ? '1 profil'
        : `${results.length} profils`;

  return (
    <div className="wrap section">
      <h1>Trouver une baby-sitter</h1>
      <p className="lead">Filtrez par lieu, tarif et disponibilité. La ville doit être écrite en entier.</p>
      <form className="filters" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="place">Ville ou code postal</label>
          <input id="place" name="place" defaultValue={place} placeholder="Lyon ou 69003" />
        </div>
        <div className="field">
          <label htmlFor="maxRate">Tarif maximum</label>
          <select id="maxRate" name="maxRate" defaultValue={maxRate}>
            {RATE_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="day">Jour</label>
          <select id="day" name="day" defaultValue={day}>
            <option value="">Tous les jours</option>
            {DAY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="when">Moment</label>
          <select id="when" name="when" defaultValue={when}>
            {WHEN_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="hint" id="when-hint">
            Le matin, l’après-midi ou le soir ne s’appliquent que si un jour est choisi.
          </p>
        </div>
        <button className="btn btn-primary" type="submit">
          Afficher les profils
        </button>
      </form>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {loading ? <p className="status-line">Recherche en cours…</p> : null}

      {!loading && !error ? (
        <>
          <p className="status-line">{countLabel}</p>
          {results.length === 0 ? (
            <p className="empty">
              Aucune baby-sitter ne correspond. Vérifiez l’orthographe de la ville, par exemple Lyon.
            </p>
          ) : (
            <div className="card-list">
              {results.map((profile) => (
                <ProfileCard key={profile.userId} profile={profile} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
