import Image from "next/image";

export function SiteFooter() {
  return (
    <footer id="location" className="mt-auto border-t border-bn-gold/20 bg-bn-charcoal text-bn-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/brand/be-nice-logo.png"
              alt="Be-Nice Catering Services"
              width={40}
              height={40}
              className="rounded-full"
            />
            <p className="font-display text-lg font-semibold">Be-Nice Catering Services</p>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-bn-cream/70">
            Authentic Ghanaian cuisine made with tradition, served with warmth — every plate, every time.
          </p>
        </div>

        <div>
          <p className="font-display text-sm uppercase tracking-[0.2em] text-bn-gold">Find Us</p>
          <p className="mt-3 text-sm leading-relaxed text-bn-cream/80">
            Adjacent Aggrey Road Sch. Park
            <br />
            Near Prince Of Peace Presby Church
            <br />
            Africa Unity Road, Community 5, Tema
          </p>
        </div>

        <div>
          <p className="font-display text-sm uppercase tracking-[0.2em] text-bn-gold">Contact</p>
          <ul className="mt-3 space-y-1 text-sm text-bn-cream/80">
            <li>055 171 3612</li>
            <li>020 646 9217</li>
            <li>030 322 4933</li>
            <li className="pt-2">@benicecateringservices</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-bn-cream/10 py-5 text-center text-xs text-bn-cream/50">
        © {new Date().getFullYear()} Be-Nice Catering Services — Powered by Coratech Restaurant OS
      </div>
    </footer>
  );
}
