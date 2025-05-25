
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

  export type QuizSummaryDTO = {
    id: number;
    title: string;
    description?: string;
    language: string;
    difficulty :string;
    category:string;
    createdAt: string;
    isPublished: boolean;
    isActive : boolean;
    user: string;
    questionCount:number;
  }

  export enum QuestionType {
    MultipleChoice   = "MultipleChoice",
    TrueFalse        = "TrueFalse",
    TypeTheAnswer    = "TypeTheAnswer",
  }

  export interface QuestionBase {
    id: number;
    text: string;
    visibility: string;
    difficulty: QuestionDifficulty;
    category: QuestionCategory;
    language: QuestionLanguage;
    imageUrl: string;
    createdAt: string;     
    userId: string;
    // statistics?: QuestionStatisticsDTO;
    type: QuestionType;
  }

  export interface MultipleChoiceQuestion extends QuestionBase {
    type: QuestionType.MultipleChoice;
    answerOptions: AnswerOption[];
    allowMultipleSelections: boolean;
  }
  export interface TrueFalseQuestion extends QuestionBase {
    type: QuestionType.TrueFalse;
    correctAnswer: boolean;
  }
  export interface TypeTheAnswerQuestion extends QuestionBase {
    type: QuestionType.TypeTheAnswer;
    correctAnswer: string;
    isCaseSensitive: boolean;
    allowPartialMatch: boolean;
    acceptableAnswers: string[] ;
  }
  
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

  export type CategoryDTO = {
    id: number;
    category: string;
    emoji: string;
  }

  export type DifficultyDTO = {
    id: number;
    level: string;
    weight :number;
  }
  export type LanguageDTO = {
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

  export interface Pagination {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  }
  
  export interface PaginatedResponse<T> {
    data: T[];
    pagination?: Pagination;
  }

  export type PaginatedQuizSummaryResponse = PaginatedResponse<QuizSummaryDTO>;
  // export type PaginatedUserResponse = PaginatedResponse<User>;

  export type PaginatedQuestionResponse = PaginatedResponse<QuestionBase>;
  export type PaginatedMultipleChoiceQuestionResponse = PaginatedResponse<MultipleChoiceQuestion>;
  export type PaginatedTrueFalseQuestionResponse = PaginatedResponse<TrueFalseQuestion>;
  export type PaginatedTypeTheAnswerQuestionResponse = PaginatedResponse<TypeTheAnswerQuestion>;




  