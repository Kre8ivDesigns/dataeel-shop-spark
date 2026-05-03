import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export const HERO_GRADIENT =
  "linear-gradient(135deg, hsl(232 59% 8%) 0%, hsl(214 52% 20%) 100%)";

/** Blurred primary/warning orbs — reuse on homepage sections for parity with PageHero / Pricing. */
export function PageHeroAmbientOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden>
      <div className="absolute top-0 left-1/4 w-72 h-72 md:w-96 md:h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 md:w-80 md:h-80 bg-warning/5 rounded-full blur-3xl" />
    </div>
  );
}

export type PageHeroProps = {
  backTo?: string;
  backLabel?: string;
  badge?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Optional right column (e.g. image or toolbar) */
  aside?: ReactNode;
  /** Grid template when `aside` is set */
  asideGridClassName?: string;
  /** Centered (marketing) vs left-aligned title block */
  align?: "center" | "left";
  /** Max width for container when using aside (wide layouts) */
  containerClassName?: string;
  /** Extra classes on the `<section>` (e.g. more bottom padding) */
  sectionClassName?: string;
};

export function PageHero({
  backTo = "/",
  backLabel = "Back to Home",
  badge,
  title,
  subtitle,
  actions,
  aside,
  asideGridClassName = "lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] lg:items-center",
  align = "center",
  containerClassName,
  sectionClassName = "",
}: PageHeroProps) {
  const titleBlock = (
    <div className={aside ? "min-w-0 text-left" : undefined}>
      {badge ? (
        <span className="badge-neon mb-2 md:mb-3 inline-block text-xs md:text-sm py-1">{badge}</span>
      ) : null}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 md:mb-4 font-heading tracking-tight lg:text-[2.75rem] lg:leading-tight">
        {title}
      </h1>
      {subtitle ? (
        <p
          className={`text-sm md:text-base text-foreground/60 leading-relaxed ${
            align === "center" && !aside ? "max-w-2xl mx-auto" : "max-w-3xl"
          }`}
        >
          {subtitle}
        </p>
      ) : null}
      {actions ? (
        <div
          className={
            align === "center" && !aside
              ? "mt-6 flex flex-wrap justify-center gap-3"
              : "mt-6 flex flex-wrap gap-3"
          }
        >
          {actions}
        </div>
      ) : null}
    </div>
  );

  return (
    <section
      className={`pt-24 pb-6 md:pb-8 relative overflow-hidden lg:pt-[5.5rem] lg:pb-6 ${sectionClassName}`.trim()}
      style={{ background: HERO_GRADIENT }}
    >
      <PageHeroAmbientOrbs />

      <div
        className={`relative mx-auto w-full px-4 ${containerClassName ?? (aside ? "max-w-[1400px]" : "container")}`}
      >
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 text-foreground/50 hover:text-foreground mb-3 md:mb-4 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={
            aside
              ? `grid gap-10 ${asideGridClassName}`
              : align === "center"
                ? "text-center max-w-3xl mx-auto"
                : ""
          }
        >
          {aside ? (
            <>
              {titleBlock}
              <div className="min-w-0">{aside}</div>
            </>
          ) : (
            titleBlock
          )}
        </motion.div>
      </div>
    </section>
  );
}
