export type RegisterInput = {
  firstName: string;
  email: string;
  password: string;
  role: string;
};

export function validateRegister(input: RegisterInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.firstName.trim()) errors.firstName = 'Indiquez votre prénom.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    errors.email = 'Indiquez une adresse e-mail valide.';
  }
  if (input.password.length < 8) {
    errors.password = 'Choisissez au moins 8 caractères.';
  } else if (input.password.length > 128) {
    errors.password = 'Le mot de passe doit rester sous 128 caractères.';
  }
  if (input.role !== 'parent' && input.role !== 'babysitter') {
    errors.role = 'Choisissez un profil.';
  }
  return errors;
}

export function validateProfile(input: { age: string; hourlyRate: string }): Record<string, string> {
  const errors: Record<string, string> = {};
  if (input.age.trim()) {
    const age = Number(input.age);
    if (!Number.isInteger(age) || age < 16 || age > 99) {
      errors.age = 'Indiquez un âge entre 16 et 99 ans.';
    }
  }
  if (input.hourlyRate.trim()) {
    const rate = Number(input.hourlyRate.replace(',', '.'));
    if (!Number.isFinite(rate) || rate < 0 || rate > 500) {
      errors.hourlyRate = 'Indiquez un tarif entre 0 et 500 €.';
    }
  }
  return errors;
}

export function validateSlot(start: string, end: string): string | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) {
    return 'Indiquez une heure de début et une heure de fin.';
  }
  if (start >= end) return 'L’heure de fin doit être après l’heure de début.';
  return null;
}

export function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
