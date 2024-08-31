
export type BaseEntity<TId = number> = {
    id: TId;
    createdAt: string;
    concurrencyStamp: string;
  };
  
  export type Entity<T, TId = number> = {
    [K in keyof T]: T[K];
  } & BaseEntity<TId>;
  

  export type User = Entity<{
    immutableName: string;  
    username: string;
    email: string;
    passwordHash: string;
    registeredDate: string;
    userUpdatedAt: string | null;
    isDeleted: boolean;
    lastLogin: string | null;
    profileImageUrl: string;
    roleId: number; // Foreign key to Role
    role?: Role; // Optional navigation property to Role
  },string>;
  
  
  export type Role = Entity<{
    name: string;
    isActive: boolean;
    description: string;
    createdById: string; // Foreign key to User
    createdBy?: User; // Optional navigation property to User
    roleUpdatedAt?: string[]; 
  }>;

  export type AuthResponse = {
    jwt: string;
    user: User;
  };
  
  