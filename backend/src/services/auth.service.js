const crypto = require('crypto');
const { DMS_USERS, SESSION_TTL_SECONDS } = require('../config');

const sessions = new Map();
const loginFailures = new Map();
const MAX_LOGIN_FAILURES = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED_ADDRESSES = 10_000;

function constantTimeEqual(actual, expected) {
  const actualHash = crypto.createHash('sha256').update(actual).digest();
  const expectedHash = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(actualHash, expectedHash);
}

function isConfigured() {
  return Object.keys(DMS_USERS).length > 0;
}

function validateConfiguration() {
  if (!isConfigured()) {
    throw new Error(
      'Configure DMS_USERS_JSON ou DMS_USER_ID e DMS_PASSWORD antes de iniciar o servidor.'
    );
  }
}

function authenticate(userId, password) {
  if (typeof userId !== 'string' || typeof password !== 'string') {
    return false;
  }

  const normalizedUserId = userId.trim();
  const expectedPassword = DMS_USERS[normalizedUserId] || '';
  const passwordMatches = constantTimeEqual(password, expectedPassword);
  return Object.hasOwn(DMS_USERS, normalizedUserId) && passwordMatches;
}

function pruneExpiredSessions(now = Date.now()) {
  for (const [token, session] of sessions) {
    if (session.expiresAt <= now) {
      sessions.delete(token);
    }
  }
}

function createSession(userId) {
  const now = Date.now();
  pruneExpiredSessions(now);

  const token = crypto.randomBytes(32).toString('base64url');
  sessions.set(token, {
    userId,
    expiresAt: now + SESSION_TTL_SECONDS * 1000,
  });
  return token;
}

function getSession(token) {
  if (typeof token !== 'string') {
    return null;
  }

  const session = sessions.get(token);
  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  return session;
}

function revokeSession(token) {
  if (typeof token === 'string') {
    sessions.delete(token);
  }
}

function isLoginBlocked(address) {
  const attempt = loginFailures.get(address);
  if (!attempt) {
    return false;
  }

  if (attempt.resetAt <= Date.now()) {
    loginFailures.delete(address);
    return false;
  }

  return attempt.count >= MAX_LOGIN_FAILURES;
}

function recordLoginFailure(address) {
  const now = Date.now();
  const current = loginFailures.get(address);

  if (current && current.resetAt > now) {
    current.count += 1;
    return;
  }

  if (loginFailures.size >= MAX_TRACKED_ADDRESSES) {
    for (const [trackedAddress, attempt] of loginFailures) {
      if (attempt.resetAt <= now) {
        loginFailures.delete(trackedAddress);
      }
    }
    if (loginFailures.size >= MAX_TRACKED_ADDRESSES) {
      loginFailures.delete(loginFailures.keys().next().value);
    }
  }

  loginFailures.set(address, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
}

function clearLoginFailures(address) {
  loginFailures.delete(address);
}

module.exports = {
  authenticate,
  clearLoginFailures,
  createSession,
  getSession,
  isConfigured,
  isLoginBlocked,
  recordLoginFailure,
  revokeSession,
  validateConfiguration,
};
