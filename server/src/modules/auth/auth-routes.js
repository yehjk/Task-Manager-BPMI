// /server/src/modules/auth/auth-routes.js
import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

// фиктивный пользователь
const MOCK_USER = {
  id: 'user-1',
  name: 'Demo User',
  email: 'demo@example.com'
};

/**
 * POST /auth/login-mock -> { token, user }
 * TMA-43
 */
router.post('/auth/login-mock', (_req, res) => {
  const token = jwt.sign(MOCK_USER, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: MOCK_USER
  });
});

export default router;
