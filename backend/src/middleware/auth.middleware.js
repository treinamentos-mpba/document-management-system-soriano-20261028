const authService = require('../services/auth.service');

const SESSION_COOKIE_NAME = 'dms_session';

function getSessionToken(req) {
  const cookieHeader = req.headers.cookie || '';
  for (const cookie of cookieHeader.split(';')) {
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    if (cookie.slice(0, separatorIndex).trim() === SESSION_COOKIE_NAME) {
      return cookie.slice(separatorIndex + 1).trim();
    }
  }

  return null;
}

function sendError(res, status, code, message) {
  res.status(status).json({ error: { code, message } });
}

function requireAuthenticated(req, res, next) {
  if (!authService.isConfigured()) {
    return sendError(
      res,
      503,
      'AUTH_NOT_CONFIGURED',
      'A autenticação do servidor não está configurada.'
    );
  }

  const token = getSessionToken(req);
  const session = authService.getSession(token);
  if (!session) {
    return sendError(res, 401, 'AUTH_REQUIRED', 'Faça login para continuar.');
  }

  req.authenticatedUser = session.userId;
  req.sessionToken = token;
  next();
}

function requireSameOrigin(req, res, next) {
  const origin = req.get('origin');
  if (!origin) {
    return next();
  }

  let originHost;
  try {
    originHost = new URL(origin).host;
  } catch {
    return sendError(res, 403, 'INVALID_ORIGIN', 'Origem da requisição inválida.');
  }

  if (originHost !== req.get('host')) {
    return sendError(res, 403, 'INVALID_ORIGIN', 'Origem da requisição não permitida.');
  }

  next();
}

module.exports = {
  getSessionToken,
  requireAuthenticated,
  requireSameOrigin,
  SESSION_COOKIE_NAME,
};
