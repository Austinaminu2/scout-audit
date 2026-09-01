import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { githubService } from '../services/githubService';
import { User } from '../db/models/User';
import { signToken } from '../utils/jwt';
import { createAuthCode, consumeAuthCode } from '../utils/authCodeStore';
import { asyncHandler } from '../utils/asyncHandler';
import { BadRequestError } from '../utils/errors';
import { config } from '../config';

const router = Router();
const STATE_COOKIE = 'gh_oauth_state';

// GET /api/auth/github - start the OAuth flow
router.get('/github', (_req: Request, res: Response) => {
  const state = randomBytes(16).toString('hex');

  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.nodeEnv === 'production',
    maxAge: 5 * 60 * 1000,
  });

  res.redirect(githubService.buildAuthorizeUrl(state));
});

// GET /api/auth/github/callback
router.get(
  '/github/callback',
  asyncHandler(async (req: Request, res: Response) => {
    const { code, state } = req.query;
    const cookieState = req.cookies?.[STATE_COOKIE];

    res.clearCookie(STATE_COOKIE);

    if (!code || typeof code !== 'string') {
      throw new BadRequestError('Missing code');
    }
    // Verifying state against the httpOnly cookie set in /github prevents
    // an attacker from tricking a victim into completing an OAuth flow the
    // attacker initiated (login CSRF).
    if (!state || !cookieState || state !== cookieState) {
      throw new BadRequestError('Invalid or missing OAuth state');
    }

    const accessToken = await githubService.exchangeCodeForToken(code);
    const githubUser = await githubService.fetchUser(accessToken);

    const [user] = await User.findOrCreate({
      where: { github_id: githubUser.id },
      defaults: {
        github_id: githubUser.id,
        github_username: githubUser.login,
        email: githubUser.email,
      },
    });

    const jwtToken = signToken({ userId: user.id, githubId: user.github_id });

    // Hand the frontend a one-time opaque code instead of the JWT itself,
    // so the real token never appears in the redirect URL, browser history,
    // or server access logs.
    const authCode = createAuthCode(jwtToken);
    res.redirect(`${config.frontendUrl}/auth?code=${authCode}`);
  })
);

// POST /api/auth/exchange - trade a one-time code for the real JWT
router.post(
  '/exchange',
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body ?? {};
    if (!code || typeof code !== 'string') {
      throw new BadRequestError('Missing code');
    }

    const token = consumeAuthCode(code);
    if (!token) {
      throw new BadRequestError('Invalid or expired code');
    }

    res.json({ token });
  })
);

export default router;
