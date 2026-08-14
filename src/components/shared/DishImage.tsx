import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Renders the real dish photo when the admin has uploaded one via Cloudinary.
 * Until then, shows a warm, on-brand placeholder (not a generic gray box)
 * so the menu still looks intentional before photography is added.
 */
export function DishImage({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden bg-bn-cream-deep", className)}>
        <Image src={src} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 400px" />
      </div>
    );
  }

  const initial = alt.trim().charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-bn-gold/25 via-bn-cream-deep to-bn-red/10",
        className
      )}
    >
      <span className="font-display text-4xl italic text-bn-red/40">{initial}</span>
    </div>
  );
}
