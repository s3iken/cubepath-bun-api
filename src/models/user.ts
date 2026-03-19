export interface User {
  id: number;
  name: string;
  email: string;
  created_at: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
}
