
export type BaseEntity<TId = number> = {
    id: TId;
    concurrencyStamp: string;
  };
  
  export type Entity<T, TId = number> = {
    [K in keyof T]: T[K];
  } & BaseEntity<TId>;
  

  export type User = Entity<{
    // concurrencyStamp: string;
    immutableName: string;  
    username: string;
    email: string;
    passwordHash: string;
    dateRegistered: string;
    userUpdatedAt: string | null;
    isDeleted: boolean;
    lastLogin: string;
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

  export type AnswerOption = {
    id : number;
    text: string;
    isCorrect: boolean;
  };

  export type Question ={
    id: number;
    text: string;
    difficulty: number; 
    category: string;
    difficultyDisplay: string; 
    answerOptions: AnswerOption[];
  };

  export type QuestionCategory = {
    id: number;
    name: string;
  };

  export type AuthResponse = {
    token: string;
    user: User;
  };

  