export interface UserModel {
  id: number;
  _id: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface SessionModel {
  id: number;
  session_token: string;
  user_email: string;
  session_start: Date;
  session_expiration: Date;
}
