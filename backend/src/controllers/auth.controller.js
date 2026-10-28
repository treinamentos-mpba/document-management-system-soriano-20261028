const authService = require('../services/auth.service');
const {
  SESSION_TTL_SECONDS,
} = require('../config');
const {
  getSessionToken,
  SESSION_COOKIE_NAME,
} = require('../middleware/auth.middleware');

const COOKIE_SECURE = process.env.NODE_ENV === 'production' ? '; Secure' : '';

function sendError(res, status, code, message) {
  res.status(status).json({ error: { code, message } });
}

function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=${token}; Max-Age=${SESSION_TTL_SECONDS}; Path=/; HttpOnly; SameSite=Strict${COOKIE_SECURE}`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict${COOKIE_SECURE}`
  );
}

function login(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!authService.isConfigured()) {
    return sendError(
      res,
      503,
      'AUTH_NOT_CONFIGURED',
      'A autenticação do servidor não está configurada.'
    );
  }

  const address = req.ip || 'unknown';
  if (authService.isLoginBlocked(address)) {
    return sendError(
      res,
      429,
      'LOGIN_RATE_LIMITED',
      'Muitas tentativas de login. Tente novamente mais tarde.'
    );
  }

  const { userId, password } = req.body || {};
  if (!authService.authenticate(userId, password)) {
    authService.recordLoginFailure(address);
    return sendError(res, 401, 'INVALID_CREDENTIALS', 'Credenciais inválidas.');
  }

  authService.clearLoginFailures(address);
  const token = authService.createSession(userId.trim());
  setSessionCookie(res, token);
  res.json({ userId: userId.trim() });
}

function currentUser(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ userId: req.authenticatedUser });
}

function logout(req, res) {
  authService.revokeSession(getSessionToken(req));
  clearSessionCookie(res);
  res.setHeader('Cache-Control', 'no-store');
  res.status(204).end();
}

module.exports = {
  currentUser,
  login,
  logout,
};
