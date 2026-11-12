import { describe, expect, it } from 'vitest';
import { register, setupTestApp } from '../test/helpers.js';

const ctx = setupTestApp();

describe('auth', () => {
  it('registers parent and returns session user', async () => {
    const agent = ctx.agent();
    const res = await register(agent, {
      email: 'parent@example.com',
      role: 'parent',
      firstName: 'Alice',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('parent@example.com');
    expect(res.body.user.role).toBe('parent');
    expect(res.body.user.profile.firstName).toBe('Alice');

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('parent@example.com');
  });

  it('rejects admin role on register', async () => {
    const agent = ctx.agent();
    const res = await agent.post('/api/auth/register').send({
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
      firstName: 'Admin',
    });
    expect(res.status).toBe(400);
  });

  it('logs in and logs out', async () => {
    const agent = ctx.agent();
    await register(agent, {
      email: 'sitter@example.com',
      role: 'babysitter',
      firstName: 'Bob',
    });
    await agent.post('/api/auth/logout');

    const login = await agent.post('/api/auth/login').send({
      email: 'sitter@example.com',
      password: 'password123',
    });
    expect(login.status).toBe(200);

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(200);
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(401);
  });
});
