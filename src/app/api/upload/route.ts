import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cloudinary } from "@/lib/cloudinary";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");
  // "context" tells us why this upload is happening. Menu photos, the hero
  // image, and staff-account-related uploads require an authenticated Admin.
  // Review photos are the one case a fully anonymous customer needs to
  // upload — gated instead by file-type/size validation below, since there's
  // no session to check for someone leaving a post-order review.
  const context = formData.get("context");

  if (context !== "review") {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return NextResponse.json(
      { error: "Cloudinary isn't configured yet. Add CLOUDINARY_* env vars, or paste an image URL instead." },
      { status: 501 }
    );
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Please upload a JPG, PNG, WEBP, or GIF image." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image is too large — please keep it under 5MB." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;

  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: context === "review" ? "be-nice-restaurant-os/reviews" : "be-nice-restaurant-os",
      resource_type: "image",
      transformation: [{ width: 1200, height: 1200, crop: "limit" }],
    });
    return NextResponse.json({ url: result.secure_url });
  } catch (err) {
    console.error("Cloudinary upload failed", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
