import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { PrivacyBlock, PrivacySection } from "./types";

const COOKIE_NOTICE_URL = "https://www.dataeel.com/cookies";
const CONTACT_US_URL = "https://www.dataeel.com/contact-us";
const SITE_URL = "https://www.dataeel.com";

/** Split text and inject links for known URLs used in the legal copy. */
export function RichParagraph({ text, className = "" }: { text: string; className?: string }) {
  const segments: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  const pushExternal = (url: string, label: string) => {
    segments.push(
      <a
        key={key++}
        href={url}
        className="text-primary font-medium underline underline-offset-2 hover:no-underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
      </a>,
    );
  };

  const pushInternalContact = () => {
    segments.push(
      <Link
        key={key++}
        to="/contact"
        className="text-primary font-medium underline underline-offset-2 hover:no-underline"
      >
        our contact page
      </Link>,
    );
  };

  while (remaining.length > 0) {
    const cookieIdx = remaining.indexOf(COOKIE_NOTICE_URL);
    const contactIdx = remaining.indexOf(CONTACT_US_URL);
    const siteIdx = remaining.indexOf(SITE_URL);

    const candidates: { idx: number; kind: "cookie" | "contact" | "site" }[] = [];
    if (cookieIdx >= 0) candidates.push({ idx: cookieIdx, kind: "cookie" });
    if (contactIdx >= 0) candidates.push({ idx: contactIdx, kind: "contact" });
    if (siteIdx >= 0) {
      const after = remaining.slice(siteIdx + SITE_URL.length);
      const isCookiePrefix = after.startsWith("/cookies");
      if (!isCookiePrefix) {
        candidates.push({ idx: siteIdx, kind: "site" });
      }
    }

    if (candidates.length === 0) {
      segments.push(remaining);
      break;
    }

    candidates.sort((a, b) => {
      if (a.idx !== b.idx) return a.idx - b.idx;
      const order: Record<typeof a.kind, number> = { cookie: 0, contact: 1, site: 2 };
      return order[a.kind] - order[b.kind];
    });

    const next = candidates[0];

    if (next.idx > 0) {
      segments.push(remaining.slice(0, next.idx));
    }

    if (next.kind === "cookie") {
      pushExternal(COOKIE_NOTICE_URL, "Cookie Notice");
      remaining = remaining.slice(next.idx + COOKIE_NOTICE_URL.length);
    } else if (next.kind === "contact") {
      pushInternalContact();
      remaining = remaining.slice(next.idx + CONTACT_US_URL.length);
    } else {
      pushExternal(SITE_URL, SITE_URL);
      remaining = remaining.slice(next.idx + SITE_URL.length);
    }
  }

  return (
    <p className={`text-muted-foreground leading-relaxed mb-4 last:mb-0 ${className}`.trim()}>{segments}</p>
  );
}

function renderBlock(block: PrivacyBlock, key: string) {
  switch (block.type) {
    case "p":
      return <RichParagraph key={key} text={block.text} />;
    case "caps":
      return (
        <p
          key={key}
          className="text-foreground text-sm font-semibold uppercase tracking-wide leading-relaxed mb-4 last:mb-0"
        >
          {block.text}
        </p>
      );
    case "h3":
      return (
        <h3 key={key} className="text-lg font-semibold text-foreground mt-6 mb-3 font-heading">
          {block.text}
        </h3>
      );
    case "h4":
      return (
        <h4 key={key} className="text-base font-semibold text-foreground mt-4 mb-2 font-heading">
          {block.text}
        </h4>
      );
    case "ul":
      return (
        <ul key={key} className="list-disc pl-6 space-y-2 text-muted-foreground mb-4 last:mb-0">
          {block.items.map((item, idx) => (
            <li key={`${key}-li-${idx}`} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div key={key} className="overflow-x-auto mb-6">
          <table className="w-full min-w-[36rem] text-sm border border-border border-collapse">
            <thead>
              <tr className="bg-muted/40">
                {block.headers.map((h) => (
                  <th
                    key={h}
                    className="border border-border p-3 text-left font-semibold text-foreground align-top"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={`${key}-r-${ri}`}>
                  {row.map((cell, ci) => (
                    <td
                      key={`${key}-r-${ri}-c-${ci}`}
                      className="border border-border p-3 text-muted-foreground align-top"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

export function PrivacySections({ sections }: { sections: PrivacySection[] }) {
  return (
    <div className="space-y-14">
      {sections.map((section) => (
        <section key={section.id} id={section.id} className="scroll-mt-28">
          <h2 className="text-xl md:text-2xl font-bold text-foreground font-heading tracking-tight mb-4">
            {section.num}. {section.title}
          </h2>
          <div className="max-w-none">{section.blocks.map((b, i) => renderBlock(b, `${section.id}-${i}`))}</div>
        </section>
      ))}
    </div>
  );
}
