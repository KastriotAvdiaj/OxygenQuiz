// types/user.types.ts

import { Entity } from "./common-types";


export type User = Entity<{
  immutableName: string;
  username: string;
  email: string;
  passwordHash: string;
  dateRegistered: string;
  userUpdatedAt: string | null;
  isDeleted: boolean;
  lastLogin: string;
  profileImageUrl: string;
  role: string;
}, string>;

export type UserBasic = {
  id: string;
  username: string;
  profileImageUrl: string;
};

export type Role = Entity<{
  name: string;
  isActive: boolean;
  description: string;
  createdById: string;
  createdBy?: User;
  roleUpdatedAt?: string[];
}>;

export type AuthResponse = {
  token: string;
  user: User;
};