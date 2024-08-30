
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
    userUpdatedAt: string | null;
    isDeleted: boolean;
    lastLogin: string | null;
    profileImageUrl: string;
  }, string>; 
  
