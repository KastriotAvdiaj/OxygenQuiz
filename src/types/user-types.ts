// types/user.types.ts

import { Entity } from "./common-types";


export type User = Entity<{
  username: string;
  email: string;
  dateRegistered: string;
  userUpdatedAt: string | null;
  isDeleted: boolean;
  lastLogin: string;
  profileImageUrl: string;
  // Many-to-many: a user now has a collection of role names (0, 1, or many).
  roles: string[];
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