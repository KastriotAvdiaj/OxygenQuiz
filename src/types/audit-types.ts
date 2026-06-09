// Mirrors the backend AuditLogDTO (camelCase over the wire).
export type AuditLog = {
  id: string;
  userId: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  oldValue: string | null; // JSON snapshot (string) or null
  newValue: string | null;
  ipAddress: string | null;
  createdAt: string;
};

// Known action verbs, mirroring AuditActions on the backend (for the filter dropdown).
export const AUDIT_ACTIONS = [
  "UserLoggedIn",
  "LoginFailed",
  "UserSignedUp",
  "UserCreated",
  "UserDeleted",
  "QuestionCreated",
  "QuestionUpdated",
  "QuestionDeleted",
  "QuizCreated",
  "QuizUpdated",
  "QuizDeleted",
  "RoleCreated",
  "RoleUpdated",
  "RoleDeleted",
] as const;

// Entity types the trail targets (for the filter dropdown).
export const AUDIT_ENTITIES = ["User", "Question", "Quiz", "Role"] as const;
