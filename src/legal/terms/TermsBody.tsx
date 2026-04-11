import { Link } from "react-router-dom";
import type { TermsBlock, TermsIntroLine, TermsSection } from "./types";

const PRIVACY_POLICY_URL = "https://www.dataeel.com/privacy-policy";

function ProseParagraph({ text }: { text: string }) {
  if (!text.includes(PRIVACY_POLICY_URL)) {
    return <p className="text-muted-foreground leading-relaxed mb-4 last:mb-0">{text}</p>;
  }
  const [before, after = ""] = text.split(PRIVACY_POLICY_URL);
  return (
    <p className="text-muted-foreground leading-relaxed mb-4 last:mb-0">
      {before}
      <Link to="/privacy-policy" className="text-primary font-medium underline underline-offset-2 hover:no-underline">
        Privacy Policy
      </Link>
      {after}
    </p>
  );
}

function renderBlock(block: TermsBlock, key: string) {
  switch (block.type) {
    case "p":
      return <ProseParagraph key={key} text={block.text} />;
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
    default: {
      const _exhaustive: never = block;
      return _exhaustive;
    }
  }
}

export function TermsIntro({ lines }: { lines: TermsIntroLine[] }) {
  return (
    <div className="space-y-4 mb-10">
      {lines.map((line, i) =>
        line.type === "caps" ? (
          <p
            key={i}
            className="text-foreground text-sm font-semibold uppercase tracking-wide leading-relaxed"
          >
            {line.text}
          </p>
        ) : (
          <p key={i} className="text-muted-foreground leading-relaxed">
            {line.text}
          </p>
        ),
      )}
    </div>
  );
}

export function TermsSections({ sections }: { sections: TermsSection[] }) {
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
