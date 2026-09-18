import { webCryptoRandomness } from "@/lib/adapters/web-crypto-randomness";

export function newRoomCode() {
  return webCryptoRandomness.roomCode();
}
