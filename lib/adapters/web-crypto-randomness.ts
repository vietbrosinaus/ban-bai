import type { Randomness } from "@/lib/ports/randomness";

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function pick(max: number) {
  if (max <= 1) return 0;
  const sample = new Uint32Array(1);
  crypto.getRandomValues(sample);
  return sample[0] % max;
}

export const webCryptoRandomness: Randomness = {
  shuffle<T>(items: T[]): T[] {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const target = pick(index + 1);
      [next[index], next[target]] = [next[target], next[index]];
    }
    return next;
  },

  id() {
    return crypto.randomUUID();
  },

  roomCode() {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => ROOM_ALPHABET[byte % ROOM_ALPHABET.length]).join("");
  },
};
