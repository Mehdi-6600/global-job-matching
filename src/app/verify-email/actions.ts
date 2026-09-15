"use server";

export async function verifyEmailToken(
  token?: string,
  email?: string
): Promise<{ success: boolean; error?: string }> {
  if (!token || !email) {
    return { success: false, error: "Token and email are required" };
  }

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || "";
    const url = `${base}/api/auth/verify/email?token=${encodeURIComponent(
      token
    )}&email=${encodeURIComponent(email)}`;

    const res = await fetch(url, { method: "GET", cache: "no-store" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.success !== true) {
      return {
        success: false,
        error:
          typeof data?.error === "string" ? data.error : "Verification failed",
      };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}
