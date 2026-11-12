import type { ReactNode } from 'react';
import type { PublicProfile } from '../../../shared/types';
import { apiOrigin } from '../api/client';
import { mediaUrl } from '../lib/format';
import { CheckIcon } from './Icons';

export function Notice({
  tone,
  children,
}: {
  tone: 'error' | 'ok';
  children: ReactNode;
}) {
  return (
    <p className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {tone === 'error' ? <>Erreur : {children}</> : children}
    </p>
  );
}

export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? (
        <p className="hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="field-error" id={`${id}-error`}>
          Erreur : {error}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

export function Avatar({ profile, large = false }: { profile: PublicProfile; large?: boolean }) {
  const src = mediaUrl(profile.photoUrl, apiOrigin());
  const className = large ? 'avatar avatar-lg' : 'avatar';
  if (src) {
    return <img className={className} src={src} alt={`Photo de ${profile.firstName}`} />;
  }
  const initial = profile.firstName.trim().charAt(0).toUpperCase() || '?';
  return (
    <span className={`${className} avatar-fallback`} aria-hidden="true">
      {initial}
    </span>
  );
}

export function VerifiedBadge() {
  return (
    <p className="badge badge-verified">
      <CheckIcon />
      <span>Profil vérifié</span>
    </p>
  );
}
