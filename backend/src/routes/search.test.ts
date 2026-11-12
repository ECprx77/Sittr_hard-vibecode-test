import { describe, expect, it } from 'vitest';
import { register, setupTestApp } from '../test/helpers.js';

const ctx = setupTestApp();

describe('profiles search availabilities', () => {
  it('updates profile, hides private phone, filters search', async () => {
    const sitter = ctx.agent();
    const parent = ctx.agent();

    const reg = await register(sitter, {
      email: 'bob@example.com',
      role: 'babysitter',
      firstName: 'Bob',
    });
    const sitterId = reg.body.user.id as number;

    await sitter.patch('/api/profiles/me').send({
      city: 'Lyon',
      postalCode: '69001',
      hourlyRate: 12,
      phone: '+33600000000',
      phonePublic: false,
    });

    await sitter.post('/api/availabilities').send({
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '12:00',
    });

    await register(parent, {
      email: 'alice@example.com',
      role: 'parent',
      firstName: 'Alice',
    });

    const publicProfile = await parent.get(`/api/profiles/${sitterId}`);
    expect(publicProfile.status).toBe(200);
    expect(publicProfile.body.profile.phone).toBeNull();
    expect(publicProfile.body.profile.city).toBe('Lyon');

    await sitter.patch('/api/profiles/me').send({ phonePublic: true });
    const public2 = await parent.get(`/api/profiles/${sitterId}`);
    expect(public2.body.profile.phone).toBe('+33600000000');

    const search = await parent.get('/api/search').query({
      city: 'Lyon',
      maxRate: 15,
      day: 1,
      after: '08:00',
      before: '13:00',
    });
    expect(search.status).toBe(200);
    expect(search.body.results).toHaveLength(1);
    expect(search.body.results[0].firstName).toBe('Bob');
  });
});
