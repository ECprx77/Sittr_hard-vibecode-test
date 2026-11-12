import { describe, expect, it } from 'vitest';
import { validateProfile, validateRegister } from './validation';

describe('inscription', () => {
  it('accepte un formulaire complet', () => {
    expect(
      validateRegister({
        firstName: 'Camille',
        email: 'camille@exemple.fr',
        password: 'motdepasse',
        role: 'parent',
      }),
    ).toEqual({});
  });

  it('signale chaque champ manquant en toutes lettres', () => {
    const errors = validateRegister({
      firstName: ' ',
      email: 'pas-un-email',
      password: 'court',
      role: '',
    });
    expect(errors.firstName).toMatch(/prénom/i);
    expect(errors.email).toMatch(/e-mail/i);
    expect(errors.password).toMatch(/8/);
    expect(errors.role).toMatch(/profil/i);
  });
});

describe('profil', () => {
  it('refuse un âge hors limites et un tarif négatif', () => {
    const errors = validateProfile({ age: '12', hourlyRate: '-1' });
    expect(errors.age).toBeTruthy();
    expect(errors.hourlyRate).toBeTruthy();
  });

  it('accepte les champs vides', () => {
    expect(validateProfile({ age: '', hourlyRate: '' })).toEqual({});
  });
});
