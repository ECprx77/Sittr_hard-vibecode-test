import type {
  AppPublicConfig,
  AuthUser,
  PublicAvailability,
  PublicProfile,
  RequestStatus,
} from '../../../shared/types';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface ContactRequest {
  id: number;
  parentId: number;
  babysitterId: number;
  message: string | null;
  status: RequestStatus;
  createdAt: string;
}

const BASE = import.meta.env.VITE_API_URL ?? '';

export function apiOrigin(): string {
  return BASE;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'Le serveur ne répond pas. Réessayez dans un instant.');
  }

  if (response.status === 204) return undefined as T;
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new ApiError(response.status, data.error || 'Une erreur est survenue.');
  }
  return data as T;
}

export const fallbackConfig: AppPublicConfig = {
  supportPhone: '+33123456789',
  appName: 'Sittr',
};

export async function getConfig(): Promise<AppPublicConfig> {
  return api<AppPublicConfig>('/api/config');
}

export async function getMe(): Promise<AuthUser> {
  const data = await api<{ user: AuthUser }>('/api/auth/me');
  return data.user;
}

export async function searchProfiles(params: URLSearchParams): Promise<PublicProfile[]> {
  const query = params.toString();
  const data = await api<{ results: PublicProfile[] }>(`/api/search${query ? `?${query}` : ''}`);
  return data.results;
}

export async function getProfile(userId: number): Promise<PublicProfile> {
  const data = await api<{ profile: PublicProfile }>(`/api/profiles/${userId}`);
  return data.profile;
}

export async function updateProfile(body: Record<string, unknown>): Promise<PublicProfile> {
  const data = await api<{ profile: PublicProfile }>('/api/profiles/me', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return data.profile;
}

export async function uploadPhoto(file: File): Promise<PublicProfile> {
  const body = new FormData();
  body.append('photo', file);
  const data = await api<{ profile: PublicProfile }>('/api/profiles/me/photo', {
    method: 'POST',
    body,
  });
  return data.profile;
}

export async function requestVerification(): Promise<PublicProfile> {
  const data = await api<{ profile: PublicProfile }>('/api/profiles/me/verification-request', {
    method: 'POST',
  });
  return data.profile;
}

export async function getMyAvailabilities(): Promise<PublicAvailability[]> {
  const data = await api<{ availabilities: PublicAvailability[] }>('/api/availabilities/me');
  return data.availabilities;
}

export async function addAvailability(slot: {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}): Promise<PublicAvailability> {
  const data = await api<{ availability: PublicAvailability }>('/api/availabilities', {
    method: 'POST',
    body: JSON.stringify(slot),
  });
  return data.availability;
}

export async function deleteAvailability(id: number): Promise<void> {
  await api(`/api/availabilities/${id}`, { method: 'DELETE' });
}

export async function getFavorites(): Promise<PublicProfile[]> {
  const data = await api<{ favorites: PublicProfile[] }>('/api/favorites');
  return data.favorites;
}

export async function addFavorite(babysitterId: number): Promise<void> {
  await api(`/api/favorites/${babysitterId}`, { method: 'POST' });
}

export async function removeFavorite(babysitterId: number): Promise<void> {
  await api(`/api/favorites/${babysitterId}`, { method: 'DELETE' });
}

export async function getSentRequests(): Promise<ContactRequest[]> {
  const data = await api<{ requests: ContactRequest[] }>('/api/requests/sent');
  return data.requests;
}

export async function getReceivedRequests(): Promise<ContactRequest[]> {
  const data = await api<{ requests: ContactRequest[] }>('/api/requests/received');
  return data.requests;
}

export async function createRequest(babysitterId: number, message: string): Promise<ContactRequest> {
  const data = await api<{ request: ContactRequest }>('/api/requests', {
    method: 'POST',
    body: JSON.stringify({ babysitterId, message }),
  });
  return data.request;
}

export async function updateRequestStatus(
  id: number,
  status: RequestStatus,
): Promise<ContactRequest> {
  const data = await api<{ request: ContactRequest }>(`/api/requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return data.request;
}
