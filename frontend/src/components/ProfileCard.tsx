import { Link } from 'react-router-dom';
import type { PublicProfile } from '../../../shared/types';
import { ageLabel, formatSlot, placeLabel, rateLabel } from '../lib/format';
import { Avatar, VerifiedBadge } from './ui';

export function ProfileCard({ profile }: { profile: PublicProfile }) {
  const slots = profile.availabilities;
  const shown = (slots ?? []).slice(0, 2);
  const extra = (slots?.length ?? 0) - shown.length;

  return (
    <article className="profile-card">
      <div className="profile-card-top">
        <Avatar profile={profile} />
        <div>
          <h2>
            <Link to={`/profil/${profile.userId}`}>{profile.firstName}</Link>
          </h2>
          <p>{ageLabel(profile.age)}</p>
          <p>{placeLabel(profile.city, profile.postalCode)}</p>
        </div>
      </div>
      {profile.verified ? <VerifiedBadge /> : null}
      <dl className="meta-list">
        <div>
          <dt>Expérience</dt>
          <dd className="clamp">{profile.experience?.trim() || 'Non renseignée'}</dd>
        </div>
        <div>
          <dt>Tarif</dt>
          <dd>{rateLabel(profile.hourlyRate)}</dd>
        </div>
        <div>
          <dt>Disponibilités</dt>
          <dd>
            {slots === undefined ? (
              'Visibles sur le profil'
            ) : shown.length === 0 ? (
              'Non renseignées'
            ) : (
              <ul className="chip-list">
                {shown.map((slot) => (
                  <li className="chip" key={slot.id}>
                    {formatSlot(slot)}
                  </li>
                ))}
                {extra > 0 ? <li className="chip">{extra} autre{extra > 1 ? 's' : ''}</li> : null}
              </ul>
            )}
          </dd>
        </div>
      </dl>
      <Link className="btn btn-secondary" to={`/profil/${profile.userId}`}>
        Voir le profil
      </Link>
    </article>
  );
}
