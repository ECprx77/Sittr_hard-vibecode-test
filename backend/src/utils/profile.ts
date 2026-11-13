import type { PublicAvailability, PublicProfile, Role, VerificationStatus } from '../shared/types.js';

export interface ProfileRow {
  user_id: number;
  first_name: string;
  age: number | null;
  city: string | null;
  postal_code: string | null;
  bio: string | null;
  experience: string | null;
  hourly_rate: number | null;
  phone: string | null;
  phone_public: number;
  photo_path: string | null;
  verification_status: VerificationStatus;
}

export interface AvailabilityRow {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export function toPublicAvailability(row: AvailabilityRow): PublicAvailability {
  return {
    id: row.id,
    dayOfWeek: row.day_of_week,
    startTime: row.start_time,
    endTime: row.end_time,
  };
}

export function toPublicProfile(
  row: ProfileRow,
  options: {
    viewerRole?: Role | null;
    viewerId?: number | null;
    includeAvailabilities?: PublicAvailability[];
  } = {},
): PublicProfile {
  const isOwner = options.viewerId === row.user_id;
  const isAdmin = options.viewerRole === 'admin';
  const phonePublic = row.phone_public === 1;
  const canSeePhone = phonePublic || isOwner || isAdmin;

  return {
    userId: row.user_id,
    firstName: row.first_name,
    age: row.age,
    city: row.city,
    postalCode: row.postal_code,
    bio: row.bio,
    experience: row.experience,
    hourlyRate: row.hourly_rate,
    photoUrl: row.photo_path ? `/uploads/${row.photo_path}` : null,
    verificationStatus: row.verification_status,
    verified: row.verification_status === 'verified',
    phone: canSeePhone ? row.phone : null,
    phonePublic,
    ...(options.includeAvailabilities
      ? { availabilities: options.includeAvailabilities }
      : {}),
  };
}
