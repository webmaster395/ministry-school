export const DEMO_ADMIN_EMAIL = "admin.demo@ministryschool.app";

export function isDemoAdminEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === DEMO_ADMIN_EMAIL;
}
