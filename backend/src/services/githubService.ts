import axios from 'axios';
import { config } from '../config';
import { GithubUserProfile } from '../types/user';

function requireGithubConfig() {
  if (!config.github.clientId || !config.github.clientSecret) {
    throw new Error('GitHub OAuth is not configured (GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET)');
  }
  return { clientId: config.github.clientId, clientSecret: config.github.clientSecret };
}

export const githubService = {
  buildAuthorizeUrl(state: string): string {
    const { clientId } = requireGithubConfig();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${config.backendUrl}/api/auth/github/callback`,
      scope: 'read:user user:email',
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  },

  async exchangeCodeForToken(code: string): Promise<string> {
    const { clientId, clientSecret } = requireGithubConfig();

    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      { client_id: clientId, client_secret: clientSecret, code },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = response.data?.access_token;
    if (!accessToken) {
      throw new Error('GitHub did not return an access token');
    }
    return accessToken;
  },

  async fetchUser(accessToken: string): Promise<GithubUserProfile> {
    const response = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    return {
      id: response.data.id,
      login: response.data.login,
      email: response.data.email,
    };
  },
};
