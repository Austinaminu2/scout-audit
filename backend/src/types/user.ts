export interface AuthUser {
  id: string;
  githubId: number;
}

export interface GithubUserProfile {
  id: number;
  login: string;
  email: string | null;
}
