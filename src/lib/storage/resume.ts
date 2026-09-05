import { put, del } from "@vercel/blob";

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_MIME = "application/pdf";

export function isBlobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^https?:\/\//i.test(value);
}

export function sanitizeResumeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "resume.pdf";
}

/**
 * Upload PDF to Vercel Blob (public read URL).
 * Requires BLOB_READ_WRITE_TOKEN.
 */
export async function uploadResumePdf(params: {
  userId: string;
  file: File | Blob;
  filename: string;
}): Promise<{ url: string; pathname: string }> {
  if (!isBlobStorageConfigured()) {
    throw new Error("BLOB_NOT_CONFIGURED");
  }

  const safe = sanitizeResumeFilename(params.filename);
  const pathname = `resumes/${params.userId}/${Date.now()}-${safe}`;

  const blob = await put(pathname, params.file, {
    access: "public",
    contentType: RESUME_MIME,
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
  });

  return { url: blob.url, pathname: blob.pathname };
}

/**
 * Delete previous blob if it looks like a Vercel Blob URL.
 * Failures are logged, not thrown (DB cleanup still proceeds).
 */
export async function deleteResumeIfBlob(
  resumeUrl: string | null | undefined
): Promise<void> {
  if (!resumeUrl || !isHttpUrl(resumeUrl)) return;
  if (!isBlobStorageConfigured()) return;

  try {
    await del(resumeUrl, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
  } catch (error) {
    console.warn("Failed to delete resume blob:", error);
  }
}
