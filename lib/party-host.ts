const DEV_PARTY_HOST = "localhost:1999";
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/;

export const PARTY_NAME = "main";

export const MISSING_HOST = "Chưa cấu hình máy chủ bàn. Đặt NEXT_PUBLIC_PARTY_HOST rồi deploy lại.";

export function partyHost() {
  const configured = process.env.NEXT_PUBLIC_PARTY_HOST?.trim();
  if (configured) return configured;
  return process.env.NODE_ENV === "production" ? "" : DEV_PARTY_HOST;
}

export function partyOrigin() {
  const host = partyHost();
  if (!host) return "";
  return `${LOCAL_HOST.test(host) ? "http" : "https"}://${host}`;
}

export function tableDoor(code: string) {
  const origin = partyOrigin();
  if (!origin) throw new Error(MISSING_HOST);
  return `${origin}/parties/${PARTY_NAME}/${encodeURIComponent(code)}`;
}
