export type Role = 'parent' | 'babysitter' | 'admin';

export type VerificationStatus = 'unverified' | 'pending' | 'verified';

export type RequestStatus =
  | 'sent'
  | 'seen'
  | 'accepted'
  | 'declined'
  | 'cancelled';

export interface ApiError {
  error: string;
  details?: unknown;
}

export interface PublicAvailability {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface PublicProfile {
  userId: number;
  firstName: string;
  age: number | null;
  city: string | null;
  postalCode: string | null;
  bio: string | null;
  experience: string | null;
  hourlyRate: number | null;
  photoUrl: string | null;
  verificationStatus: VerificationStatus;
  verified: boolean;
  phone: string | null;
  phonePublic: boolean;
  availabilities?: PublicAvailability[];
}

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
  profile: PublicProfile | null;
}

export interface AppPublicConfig {
  supportPhone: string;
  appName: string;
}
