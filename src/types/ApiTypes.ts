
export type BaseEntity<TId = number> = {
    id: TId;
    concurrencyStamp: string;
  };
  
  export type Entity<T, TId = number> = {
    [K in keyof T]: T[K];
  } & BaseEntity<TId>;
  
  export type AuthResponse = {
    token: string;
    user: User;
  };

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
  
  export type UserBasic = {
    id: string;
    username: string;
    profileImageUrl: string;
  };
  
  
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

  export type Quiz = {
    id: number;
    title: string;
    description: string;
    language: string;
    category:string;
    createdAt: string;
    isPublished: boolean;
    numberOfQuestions: number;
  }

  export type Question ={
    id: number;
    difficulty: DifficultyDTO;
    user: UserBasic; // not being used for now
    text: string;
    category: CategoryDTO;
    language :LangaugeDTO;
    visibility:string;
    timeLimit: number; //not in the backend yet
    answerOptions: AnswerOption[];
  };

  export type IndividualQuestion = {
    id: number;
    text: string;
    createdAt: string;
    userId : string;
    user: UserBasic;
    difficulty: string;
    language :string;
    languageId: number;
    difficultyId: number;
    category: string;
    visibility:string;
    categoryId: number;
    answerOptions: AnswerOption[];
  }

  type CategoryDTO = {
    id: number;
    category: string;
    emoji: string;
  }

  type DifficultyDTO = {
    id: number;
    level: string;
    weight :number;
  }
  type LangaugeDTO = {
    id: number;
    language: string;
  }

  export type QuestionCategory = {
    id: number;
    createdAt: string;
    username: string;
    name: string;
  };

  export type QuestionDifficulty = {
    id: number;
    level: string;
    username: string;
    weight: number;
    createdAt: string;
  };

  export type QuestionLanguage = {
    id: number;
    language: string;
    username: string;
    createdAt: string;
  };

  type PaginatedResponse<T> = {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    items: T[];
  };

  export type PaginatedQuestionResponse = PaginatedResponse<Question>;



  