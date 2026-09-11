export type UserId = string;

export interface SessionState {
  userId: UserId | null;
  expiresAt: string | null;
}

export type LoadState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string };
