const STOREFRONT_CONNECTION_ERROR_CODES = new Set(["P1001", "P1002", "P1017", "P2024"]);

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "";
}

export function isStorefrontConnectionError(error: unknown) {
  const code = getErrorCode(error);
  if (code && STOREFRONT_CONNECTION_ERROR_CODES.has(code)) {
    return true;
  }

  const message = getErrorMessage(error);

  return (
    message.includes("Can't reach database server") ||
    message.includes("Timed out fetching a new connection") ||
    message.includes("Server has closed the connection") ||
    message.includes("Environment variable not found: DATABASE_URL")
  );
}

export function logStorefrontFallback(scope: string, error: unknown) {
  const code = getErrorCode(error);
  const message = getErrorMessage(error);

  console.warn(
    `[storefront] ${scope} database read failed; using safe fallback${code ? ` (${code})` : ""}${
      message ? `: ${message}` : ""
    }`,
  );
}

export async function withStorefrontDbFallback<T>(scope: string, fallback: T, operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (isStorefrontConnectionError(error)) {
      logStorefrontFallback(scope, error);
      return fallback;
    }
    throw error;
  }
}
