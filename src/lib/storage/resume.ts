import { put, del } from "@vercel/blob";
import { randomBytes } from "crypto";

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_MIME = "application/pdf";

/** Magic bytes for PDF: %PDF */
function isPdfMagic(buf: ArrayBuffer | Uint8Array): boolean {
  const u8 =
    buf instanceof Uint8Array ? buf : new Uint8Array(buf.slice(0, 5));
  if (u8.length < 4) return false;
  return (
    u8[0] === 0x25 &&
    u8[1] === 0x50 &&
    u8[2] === 0x44 &&
    u8[3] === 0x46
  );
}

export function isBlobStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function isHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^https?:\/\//i.test(value);
}

export function sanitizeResumeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  if (!base.toLowerCase().endsWith(".pdf")) {
    return `${base || "resume"}.pdf`;
  }
  return base || "resume.pdf";
}

/**
 * Upload resume PDF.
 *
 * @vercel/blob@0.27 only types `access: "public"`.
 * True ACL privacy is enforced by:
 * 1) Never returning the blob URL to clients
 * 2) Serving only via authenticated download route after ownership check
 * 3) Unpredictable pathname (userId + random)
 *
 * When upgrading @vercel/blob to a version with private ACL, set access: "private".
 */
export async function uploadResumePdf(params: {
  userId: string;
  file: File | Blob;
  filename: string;
}): Promise<{ url: string; pathname: string }> {
  if (!isBlobStorageConfigured()) {
    throw new Error("BLOB_NOT_CONFIGURED");
  }

  const ab = await params.file.arrayBuffer();
  if (ab.byteLength > RESUME_MAX_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }
  if (ab.byteLength < 8 || !isPdfMagic(ab)) {
    throw new Error("INVALID_PDF");
  }

  const safe = sanitizeResumeFilename(params.filename);
  const nonce = randomBytes(16).toString("hex");
  const pathname = `resumes/${params.userId}/${nonce}-${safe}`;

  const blob = await put(pathname, ab, {
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
 * Server-side fetch of stored PDF bytes (never expose URL to browser).
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
    redirect: "error",
  });

  if (res.status === 404) {
    throw new Error("BLOB_NOT_FOUND");
  }

  if (!res.ok) {
    throw new Error("BLOB_FETCH_FAILED");
  }

  const contentType = res.headers.get("content-type") || RESUME_MIME;

  return new Response(res.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": 'attachment; filename="resume.pdf"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
