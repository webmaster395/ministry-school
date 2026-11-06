export const MAPP_GUEST_OPENS_AT = new Date("2026-11-07T06:00:00.000Z");

export function isMappGuestOpen(now = new Date()) {
  return now.getTime() >= MAPP_GUEST_OPENS_AT.getTime();
}
