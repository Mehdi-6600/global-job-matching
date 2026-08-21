"use server";

export async function verifyEmailToken(token: string) {
  if (!token) {
    return { success: false, error: "Token is required" };
  }

  // TODO:
  // 1. Look up token in your database
  // 2. Check if token is expired
  // 3. Mark user.emailVerified = true
  // 4. Delete or invalidate the token

  console.log("Verifying email token:", token);

  return { success: true };
}
