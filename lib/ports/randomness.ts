export interface Randomness {
  shuffle<T>(items: T[]): T[];
  id(): string;
  roomCode(): string;
}
