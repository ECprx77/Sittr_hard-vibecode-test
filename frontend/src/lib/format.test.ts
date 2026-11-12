import { describe, expect, it } from 'vitest';
import {
  buildSearchParams,
  formatPhone,
  formatSlot,
  mediaUrl,
  parsePlace,
  presetRange,
  whenFromRange,
  requestStatusLabel,
  smsHref,
  telHref,
} from './format';

describe('téléphone et liens', () => {
  it('affiche un numéro français lisible', () => {
    expect(formatPhone('+33123456789')).toBe('01 23 45 67 89');
    expect(formatPhone('0612345678')).toBe('06 12 34 56 78');
  });

  it('construit un lien d’appel et un SMS avec message', () => {
    expect(telHref('+33123456789')).toBe('tel:+33123456789');
    expect(smsHref('0612345678', 'Bonjour Camille')).toBe(
      'sms:+33612345678?body=Bonjour%20Camille',
    );
  });
});

describe('recherche', () => {
  it('distingue un code postal d’une ville', () => {
    expect(parsePlace(' 69003 ')).toEqual({ postalCode: '69003' });
    expect(parsePlace('Lyon')).toEqual({ city: 'Lyon' });
    expect(parsePlace('')).toEqual({});
  });

  it('traduit un moment de la journée en horaires', () => {
    expect(presetRange('morning')).toEqual({ before: '12:00' });
    expect(presetRange('afternoon')).toEqual({ after: '12:00', before: '18:00' });
    expect(presetRange('evening')).toEqual({ after: '18:00' });
    expect(presetRange('')).toEqual({});
  });

  it('reconnaît un moment déjà choisi', () => {
    expect(whenFromRange('18:00', null)).toBe('evening');
    expect(whenFromRange(null, '12:00')).toBe('morning');
    expect(whenFromRange('12:00', '18:00')).toBe('afternoon');
    expect(whenFromRange(null, null)).toBe('');
  });

  it('n’envoie l’horaire que si un jour est choisi', () => {
    expect(
      buildSearchParams({
        place: 'Lyon',
        maxRate: '14',
        day: '1',
        when: 'evening',
      }).toString(),
    ).toBe('city=Lyon&maxRate=14&day=1&after=18%3A00');

    expect(
      buildSearchParams({ place: '44000', maxRate: '', day: '', when: 'evening' }).toString(),
    ).toBe('postalCode=44000');
  });
});

describe('affichage', () => {
  it('écrit un créneau en français', () => {
    expect(formatSlot({ id: 1, dayOfWeek: 1, startTime: '18:00', endTime: '21:00' })).toBe(
      'Lundi · 18:00 – 21:00',
    );
  });

  it('nomme le statut d’une demande', () => {
    expect(requestStatusLabel('accepted')).toBe('Acceptée');
    expect(requestStatusLabel('sent')).toBe('Envoyée');
  });

  it('résout une photo servie par l’API', () => {
    expect(mediaUrl(null, '')).toBeNull();
    expect(mediaUrl('/uploads/a.jpg', '')).toBe('/uploads/a.jpg');
    expect(mediaUrl('/uploads/a.jpg', 'http://localhost:3001/api')).toBe(
      'http://localhost:3001/uploads/a.jpg',
    );
  });
});
