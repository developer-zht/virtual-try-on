export interface LoginRaw {
  access_token: string;
  expires_in: number;
  user: { id: string; email: string };
}
