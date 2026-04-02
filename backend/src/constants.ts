export const COLUMN_NAMES = {
  TO_DO: 'TO_DO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
  CLOSED: 'CLOSED',
} as const;

export const TASK_TYPES = {
  STORY: 'STORY',
  TASK: 'TASK',
  BUG: 'BUG',
} as const;

export const TASK_PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export const PROJECT_ROLES = {
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
} as const;

export const GLOBAL_ROLES = {
  GLOBAL_ADMIN: 'GLOBAL_ADMIN',
  USER: 'USER',
} as const;

export const VALID_TASK_TYPES = Object.values(TASK_TYPES);
export const VALID_PRIORITIES = Object.values(TASK_PRIORITIES);
export const VALID_PROJECT_ROLES = Object.values(PROJECT_ROLES);
