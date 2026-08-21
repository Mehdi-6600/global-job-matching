"use server";

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email || !email.includes("@")) {
    return { success: false, error: "Valid email is required" };
  }

  // TODO:
  // 1. Check if user exists in your database
  // 2. Generate a secure reset token (crypto.randomUUID or nanoid)
  // 3. Store token with expiry (e.g., 1 hour) in DB
  // 4. Send email with reset link: /reset-password?token=xyz

  console.log("Password reset requested for:", email);

  return { success: true };
}
