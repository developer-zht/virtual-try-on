export interface LoginRaw {
  access_token: string;
  expires_in: number;
  profile_completed: boolean;
  user: { id: string; email: string; nickname: string; avatar_url: string; city_code: string };
}
