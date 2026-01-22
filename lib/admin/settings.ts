export function isAdminAuthDisabled() {
  return process.env.ADMIN_DISABLE_AUTH === "1";
}
