import { createTableService, type TableService } from "@/lib/application/table-service";
import { createBucket, inMemoryRoomRepository, type MemoryBucket } from "@/lib/adapters/in-memory-room-repository";
import { neonRoomRepository } from "@/lib/adapters/neon-room-repository";
import { systemClock } from "@/lib/adapters/system-clock";
import { webCryptoRandomness } from "@/lib/adapters/web-crypto-randomness";

const globals = globalThis as typeof globalThis & { __banBaiBucket?: MemoryBucket; __banBaiWarned?: boolean };

export function tableService(): TableService {
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

  if (connectionString) {
    const repository = neonRoomRepository(connectionString);
    return createTableService({ rooms: repository, hands: repository, clock: systemClock, random: webCryptoRandomness });
  }

  if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required in production.");

  if (!globals.__banBaiWarned) {
    globals.__banBaiWarned = true;
    console.warn("[ban-bai] No DATABASE_URL, using the in-memory repository. Tables vanish when the server restarts.");
  }
  globals.__banBaiBucket ??= createBucket();
  const repository = inMemoryRoomRepository(globals.__banBaiBucket);
  return createTableService({ rooms: repository, hands: repository, clock: systemClock, random: webCryptoRandomness });
}
