export type AuthMode = "login" | "register";

export function buildAuthPath(mode: AuthMode, next = "/viewer") {
  const params = new URLSearchParams({
    mode,
    next,
  });

  return `/auth?${params.toString()}`;
}
