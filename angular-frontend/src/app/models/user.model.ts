export interface User {
  username: string;
  email: string;
  role: 'ROLE_USER' | 'ROLE_ADMIN';
  token?: string;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  username: string;
  email: string;
  role: 'ROLE_USER' | 'ROLE_ADMIN';
}
