export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string;
  ensName: string;
  walletNickname: string;
  avatar: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}
