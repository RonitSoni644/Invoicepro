const authWaiters = new Set<(userId: string | null) => void>();
let cachedAuthUserId: string | null = null;
let authResolved = false;

export function publishAuthState(userId: string | null) {
  cachedAuthUserId = userId;
  authResolved = true;
  authWaiters.forEach((resolve) => resolve(userId));
  authWaiters.clear();
}

export function getCachedAuthUserId() {
  return cachedAuthUserId;
}

export function isAuthResolved() {
  return authResolved;
}

export function waitForAuthUserId(timeoutMs = 4000): Promise<string | null> {
  if (authResolved) {
    return Promise.resolve(cachedAuthUserId);
  }

  return new Promise((resolve) => {
    const handleResolve = (userId: string | null) => {
      window.clearTimeout(timer);
      resolve(userId);
    };

    const timer = window.setTimeout(() => {
      authWaiters.delete(handleResolve);
      resolve(cachedAuthUserId);
    }, timeoutMs);

    authWaiters.add(handleResolve);
  });
}

export async function requireAuthUserId(timeoutMs = 4000): Promise<string> {
  const userId = await waitForAuthUserId(timeoutMs);

  if (userId) {
    return userId;
  }

  throw new Error("Auth session missing!");
}
