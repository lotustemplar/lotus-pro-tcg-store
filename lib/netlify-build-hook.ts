type BuildHookResult =
  | { triggered: true }
  | { triggered: false; reason: "missing" | "failed"; detail?: string };

export async function triggerNetlifyBuildHook(): Promise<BuildHookResult> {
  const hookUrl = process.env.NETLIFY_BUILD_HOOK_URL?.trim();
  if (!hookUrl) {
    return { triggered: false, reason: "missing" };
  }

  try {
    const response = await fetch(hookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "admin-site-settings" }),
    });

    if (!response.ok) {
      return {
        triggered: false,
        reason: "failed",
        detail: `Build hook returned ${response.status}.`,
      };
    }

    return { triggered: true };
  } catch (error) {
    return {
      triggered: false,
      reason: "failed",
      detail: error instanceof Error ? error.message : "Unknown build hook error.",
    };
  }
}
