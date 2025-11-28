import { Router } from 'express';
import { COOKIE_NAME } from '@shared/const';
import { getSessionCookieOptions } from './_core/cookies';

const router = Router();

const ADMIN_PASSWORD = 'Cocomelone22*';
const ADMIN_SESSION_TOKEN = 'admin_session_active';

// Admin login
router.post('/login', (req, res) => {
  const { password } = req.body;

  if (password === ADMIN_PASSWORD) {
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie('admin_session', ADMIN_SESSION_TOKEN, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid password' });
  }
});

// Admin logout
router.post('/logout', (req, res) => {
  const cookieOptions = getSessionCookieOptions(req);
  res.clearCookie('admin_session', { ...cookieOptions, maxAge: -1 });
  res.json({ success: true });
});

// Check admin session
router.get('/check', (req, res) => {
  const adminSession = req.cookies?.admin_session;
  const isAuthenticated = adminSession === ADMIN_SESSION_TOKEN;
  res.json({ isAuthenticated });
});

export default router;

