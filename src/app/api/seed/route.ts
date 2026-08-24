import { NextRequest, NextResponse } from "next/server";

// ✅ این API فقط در محیط توسعه (Development) قابل استفاده است
export async function GET(req: NextRequest) {
  // اگر در محیط تولید هستیم، خطا بده
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "این مسیر در محیط تولید غیرفعال است" },
      { status: 403 }
    );
  }

  // ✅ در محیط توسعه، با یک کلید ساده محافظت کن
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.SEED_SECRET || "dev-secret-123"}`) {
    return NextResponse.json(
      { error: "کلید امنیتی نامعتبر" },
      { status: 401 }
    );
  }

  // ... کدهای مربوط به Seed (همان کد قبلی) ...
  // (من اینجا کل کد رو نمی‌نویسم چون قبلاً داری، فقط مطمئن شو که این دو شرط رو اضافه کنی)

  return NextResponse.json({ success: true, message: "Seed completed!" });
}
