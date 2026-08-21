"use server";

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email || !email.includes("@")) {
    return { success: false, error: "Valid email is required" };
  }

  console.log("Password reset requested for:", email);

  return { success: true };
}
