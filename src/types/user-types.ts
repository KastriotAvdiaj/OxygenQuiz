// types/user.types.ts

import { Entity } from "./common-types";


export type User = Entity<{
  username: string;
  email: string;
  emailConfirmed: boolean;
  dateRegistered: string;
  userUpdatedAt: string | null;
  isDeleted: boolean;
  lastLogin: string;
  profileImageUrl: string;
  // Many-to-many: a user has a collection of role names (0, 1, or many).
  roles: string[];
  permissions: string[];
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

// Public, safe-to-expose profile of any user (mirrors backend PublicUserProfileDTO).
export type PublicUserProfile = {
  id: string;
  username: string;
  profileImageUrl: string | null;
  dateRegistered: string;
  roles: string[];
};