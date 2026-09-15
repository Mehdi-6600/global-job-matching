"use server";

export async function requestPasswordReset(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const email = formData.get("email") as string;

  if (!email || !email.includes("@")) {
    return { success: false, error: "Valid email is required" };
  }

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || "";
    const res = await fetch(`${base}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.success !== true) {
      return {
        success: false,
        error:
          typeof data?.error === "string"
            ? data.error
            : "Failed to send reset link",
      };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}
