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

export interface GroupModel {
  id: number;
  _id: string;
  author_id: string;
  label: string;
  created_at: Date;
  updated_at: Date;
}

export interface BlockModel {
  id: number;
  _id: string;
  group_id: string;
  author_id: string;
  position: string;
  content: string;
  locked: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TransformationModel {
  id: number;
  _id: string;
  group_id: string;
  author_id: string;
  input_block_id: string;
  position: string;
  prompt: string;
  outputs: number;
  locked: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TransformationOutputModel {
  id: number;
  transformation_id: string;
  output_block_id: string;
}