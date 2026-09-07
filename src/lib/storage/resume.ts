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
 * Upload PDF to Vercel Blob.
 * Store returned url in DB; serve only via authenticated download route.
 * @vercel/blob@0.27 supports access: "public" (URL is not exposed to clients).
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

/**
 * Fetch blob bytes for an authorized download response.
 * Does not use a non-existent `get` export from @vercel/blob@0.27.
 */
export async function fetchPrivateResumeBlob(
  resumeUrl: string
): Promise<Response> {
  if (!isBlobStorageConfigured()) {
    throw new Error("BLOB_NOT_CONFIGURED");
  }

  if (!isHttpUrl(resumeUrl)) {
    throw new Error("BLOB_NOT_FOUND");
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const res = await fetch(resumeUrl, {
    method: "GET",
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new Error("BLOB_NOT_FOUND");
  }

  if (!res.ok) {
    throw new Error(`BLOB_FETCH_FAILED:${res.status}`);
  }

  const contentType = res.headers.get("content-type") || RESUME_MIME;
  const body = res.body;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": 'attachment; filename="resume.pdf"',
      "Cache-Control": "private, no-store",
    },
  });
}
