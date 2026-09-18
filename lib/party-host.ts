const DEFAULT_PARTY_HOST = "localhost:1999";
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/;

export const PARTY_NAME = "main";

export function partyHost() {
  return process.env.NEXT_PUBLIC_PARTY_HOST ?? DEFAULT_PARTY_HOST;
}

export function partyOrigin() {
  const host = partyHost();
  return `${LOCAL_HOST.test(host) ? "http" : "https"}://${host}`;
}

export function tableDoor(code: string) {
  return `${partyOrigin()}/parties/${PARTY_NAME}/${encodeURIComponent(code)}`;
}
