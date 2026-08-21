"use server";

export async function verifyEmailToken(token: string) {
  if (!token) {
    return { success: false, error: "Token is required" };
  }

  console.log("Verifying email token:", token);

  return { success: true };
}
