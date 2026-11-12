import session from 'express-session';
import type Database from 'better-sqlite3';

type SessionData = session.SessionData;

export class SqliteSessionStore extends session.Store {
  constructor(private readonly database: Database.Database) {
    super();
  }

  get(
    sid: string,
    callback: (err: unknown, session?: SessionData | null) => void,
  ): void {
    try {
      const row = this.database
        .prepare(
          'SELECT sess FROM sessions WHERE sid = ? AND expired > ?',
        )
        .get(sid, Date.now()) as { sess: string } | undefined;
      if (!row) {
        callback(null, null);
        return;
      }
      callback(null, JSON.parse(row.sess) as SessionData);
    } catch (err) {
      callback(err);
    }
  }

  set(
    sid: string,
    sess: SessionData,
    callback?: (err?: unknown) => void,
  ): void {
    try {
      const maxAge = sess.cookie?.maxAge ?? 86400000;
      const expired = Date.now() + maxAge;
      this.database
        .prepare(
          `INSERT INTO sessions (sid, sess, expired) VALUES (?, ?, ?)
           ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expired = excluded.expired`,
        )
        .run(sid, JSON.stringify(sess), expired);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    try {
      this.database.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      callback?.();
    } catch (err) {
      callback?.(err);
    }
  }

  touch(
    sid: string,
    sess: SessionData,
    callback?: (err?: unknown) => void,
  ): void {
    this.set(sid, sess, callback);
  }
}
