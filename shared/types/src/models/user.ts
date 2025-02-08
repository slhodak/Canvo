export interface UserModel {
  id: number;
  userId: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionModel {
  id: number;
  sessionToken: string;
  userEmail: string;
  sessionStart: Date;
  sessionExpiration: Date;
}
