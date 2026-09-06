import { put, del, get } from "@vercel/blob";

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
 * Upload PDF to Vercel Blob with private access.
 * Store returned url/pathname in DB; serve only via authenticated download route.
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
    access: "private",
    contentType: RESUME_MIME,
    token: process.env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
  });

  return { url: blob.url, pathname: blob.pathname };
}

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

/** Stream private blob for authorized download */
export async function fetchPrivateResumeBlob(
  resumeUrl: string
): Promise<Response> {
  if (!isBlobStorageConfigured()) {
    throw new Error("BLOB_NOT_CONFIGURED");
  }

  const result = await get(resumeUrl, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  if (!result) {
    throw new Error("BLOB_NOT_FOUND");
  }

  // @vercel/blob get() returns a Blob-like / Response depending on version
  if (result instanceof Response) {
    return result;
  }

  const body = result as Blob;
  return new Response(body.stream(), {
    headers: {
      "Content-Type": RESUME_MIME,
      "Content-Disposition": 'attachment; filename="resume.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
