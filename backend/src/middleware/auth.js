const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header provided' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const actual=(await require('../db').query('SELECT id,email,role FROM users WHERE id=$1',[decoded.id])).rows[0];
    if(!actual)return res.status(401).json({error:'Saved account is no longer available. Sign in again.'});
    req.user = {...decoded,...actual};
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired' });
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') return res.status(401).json({ error: 'Invalid token' });
    return res.status(503).json({ error: 'The saved account could not be checked. Retry when storage is available.' });
  }
}

module.exports = authMiddleware;
