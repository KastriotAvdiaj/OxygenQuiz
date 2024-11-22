
export type BaseEntity<TId = number> = {
    id: TId;
    createdAt: string;
    concurrencyStamp: string;
  };
  
  export type Entity<T, TId = number> = {
    [K in keyof T]: T[K];
  } & BaseEntity<TId>;
  

  export type User = Entity<{
    concurrencyStamp: string;
    immutableName: string;  
    username: string;
    email: string;
    passwordHash: string;
    dateRegistered: string;
    userUpdatedAt: string | null;
    isDeleted: boolean;
    lastLogin: string | null;
    profileImageUrl: string;
    role : string;
  },string>;
  
  
  export type Role = Entity<{
    name: string;
    isActive: boolean;
    description: string;
    createdById: string; // Foreign key to User
    createdBy?: User; // Optional navigation property to User
    roleUpdatedAt?: string[]; 
  }>;

  export type AnswerOption = Entity<{
    id : number;
    text: string;
    isCorrect: boolean;
  }>;

  export type Question = Entity<{
    question: string;
    difficulty: number; 
    difficultyDisplay: string; 
    answerOptions: AnswerOption[];
  }>;

  export type AuthResponse = {
    token: string;
    user: User;
  };

  