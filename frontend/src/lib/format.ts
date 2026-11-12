import type { PublicAvailability, RequestStatus } from '../../../shared/types';

export const DAYS = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
] as const;

export const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 0].map((value) => ({
  value: String(value),
  label: DAYS[value],
}));

export type TimePreset = '' | 'morning' | 'afternoon' | 'evening';

export const WHEN_OPTIONS: { value: TimePreset; label: string }[] = [
  { value: '', label: 'Toute la journée' },
  { value: 'morning', label: 'Le matin' },
  { value: 'afternoon', label: 'L’après-midi' },
  { value: 'evening', label: 'Le soir' },
];

export const RATE_OPTIONS = [
  { value: '', label: 'Tous les tarifs' },
  { value: '12', label: 'Jusqu’à 12 €' },
  { value: '14', label: 'Jusqu’à 14 €' },
  { value: '16', label: 'Jusqu’à 16 €' },
  { value: '20', label: 'Jusqu’à 20 €' },
];

const STATUS_LABELS: Record<RequestStatus, string> = {
  sent: 'Envoyée',
  seen: 'Vue',
  accepted: 'Acceptée',
  declined: 'Déclinée',
  cancelled: 'Annulée',
};

export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const national = digits.startsWith('33') ? `0${digits.slice(2)}` : digits;
  if (national.length === 10) {
    return national.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  }
  return raw;
}

export function telHref(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('00')) return `tel:+${digits.slice(2)}`;
  if (digits.startsWith('33')) return `tel:+${digits}`;
  if (digits.startsWith('0')) return `tel:+33${digits.slice(1)}`;
  return `tel:+${digits}`;
}

export function smsHref(raw: string, body: string): string {
  return `sms:${telHref(raw).replace('tel:', '')}?body=${encodeURIComponent(body)}`;
}

export function parsePlace(input: string): { city?: string; postalCode?: string } {
  const value = input.trim();
  if (!value) return {};
  if (/^\d{5}$/.test(value)) return { postalCode: value };
  return { city: value };
}

export function presetRange(preset: TimePreset): { after?: string; before?: string } {
  if (preset === 'morning') return { before: '12:00' };
  if (preset === 'afternoon') return { after: '12:00', before: '18:00' };
  if (preset === 'evening') return { after: '18:00' };
  return {};
}

export function whenFromRange(after: string | null, before: string | null): TimePreset {
  if (after === '18:00' && !before) return 'evening';
  if (!after && before === '12:00') return 'morning';
  if (after === '12:00' && before === '18:00') return 'afternoon';
  return '';
}

export function buildSearchParams(input: {
  place: string;
  maxRate: string;
  day: string;
  when: TimePreset;
}): URLSearchParams {
  const params = new URLSearchParams();
  const place = parsePlace(input.place);
  if (place.city) params.set('city', place.city);
  if (place.postalCode) params.set('postalCode', place.postalCode);
  if (input.maxRate) params.set('maxRate', input.maxRate);
  if (input.day !== '') {
    params.set('day', input.day);
    const range = presetRange(input.when);
    if (range.after) params.set('after', range.after);
    if (range.before) params.set('before', range.before);
  }
  return params;
}

export function formatSlot(slot: PublicAvailability): string {
  return `${DAYS[slot.dayOfWeek]} · ${slot.startTime} – ${slot.endTime}`;
}

export function requestStatusLabel(status: RequestStatus): string {
  return STATUS_LABELS[status];
}

export function mediaUrl(photoUrl: string | null, apiBase: string): string | null {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('http')) return photoUrl;
  if (!apiBase) return photoUrl;
  return `${apiBase.replace(/\/api\/?$/, '')}${photoUrl}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function placeLabel(city: string | null, postalCode: string | null): string {
  const parts = [city, postalCode].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Secteur non renseigné';
}

export function ageLabel(age: number | null): string {
  return age === null ? 'Âge non renseigné' : `${age} ans`;
}

export function rateLabel(rate: number | null): string {
  if (rate === null) return 'Tarif non renseigné';
  const formatted = Number.isInteger(rate) ? String(rate) : rate.toFixed(2).replace('.', ',');
  return `${formatted} € / heure`;
}

export function smsBody(firstName: string): string {
  return `Bonjour ${firstName}, je vous contacte via Sittr.`;
}
