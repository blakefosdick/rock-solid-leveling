import { useId, useState, type FormEvent } from "react";
import "./app.css";
import "./design.css";
import heroLogo from "../images/logos/LogoSquareTextandImagepng.png";
import headerLogo from "../images/logos/TextandSlabsHorizontal.png";
import footerLogo from "../images/logos/textandaddress.svg";
import levelGraphic from "../images/logos/level.png";
import processSlabGraphic from "../images/logos/slab.png";

const beforeImage = "./media/before.jpg";
const afterImage = "./media/after.jpg";

const colorTokens = [
  {
    name: "Background",
    token: "--bg",
    value: "#f7f7f3",
    note: "Default light canvas with subtle warmth."
  },
  {
    name: "Surface",
    token: "--surface",
    value: "#ffffff",
    note: "Cards, forms, and elevated modules."
  },
  {
    name: "Surface Soft",
    token: "--surface-soft",
    value: "#f5f7fb",
    note: "Secondary field and utility backgrounds."
  },
  {
    name: "Ink",
    token: "--ink",
    value: "#121726",
    note: "Primary heading and body text color."
  },
  {
    name: "Muted",
    token: "--muted",
    value: "#687184",
    note: "Supportive copy, labels, and helper text."
  },
  {
    name: "Blue",
    token: "--blue",
    value: "#1453e5",
    note: "Primary CTA and key interactive highlight."
  },
  {
    name: "Teal",
    token: "--teal",
    value: "#0f7a72",
    note: "Secondary accent used in upload and utility actions."
  },
  {
    name: "Orange",
    token: "--orange",
    value: "#e77d23",
    note: "Brand punch used sparingly for emphasis."
  },
  {
    name: "Navy",
    token: "--navy",
    value: "#0d1528",
    note: "Dark result band and footer foundation."
  }
];

const radiusTokens = [
  { label: "XL", token: "--radius-xl", value: "1.75rem" },
  { label: "LG", token: "--radius-lg", value: "1.25rem" },
  { label: "MD", token: "--radius-md", value: "1rem" }
];

const shadowTokens = [
  {
    label: "Default",
    token: "--shadow",
    value: "0 22px 50px rgba(11, 20, 38, 0.08)"
  },
  {
    label: "Strong",
    token: "--shadow-strong",
    value: "0 28px 70px rgba(8, 17, 33, 0.16)"
  }
];

const designRules = [
  "Favor clean, high-trust layouts with strong lead-generation intent.",
  "Keep the brand palette anchored in blue, teal, orange, and dark navy. Do not introduce purple-led styling.",
  "Use Archivo for major headings and Manrope for UI and body copy.",
  "Preserve rounded, elevated cards instead of sharp or flat panels.",
  "Use the dark navy band for high-impact proof sections, not the whole page.",
  "Maintain mobile-first spacing and full-width CTAs on small screens.",
  "Keep concrete, slab, and level imagery crisp, practical, and brand-relevant.",
  "Default to accessible contrast, clear focus states, and reduced-motion support."
];

function DesignFaqItem({
  question,
  answer,
  defaultOpen = false
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const buttonId = useId();
  const panelId = useId();

  return (
    <article className={`faq-item${isOpen ? " is-open" : ""}`}>
      <h3 className="faq-item__heading">
        <button
          id={buttonId}
          className="faq-item__trigger"
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen((currentValue) => !currentValue)}
        >
          <span>{question}</span>
          <span className="faq-item__icon" aria-hidden="true" />
        </button>
      </h3>

      <div
        id={panelId}
        className="faq-item__panel"
        role="region"
        aria-labelledby={buttonId}
        aria-hidden={!isOpen}
        style={{ height: isOpen ? "auto" : "0px", opacity: isOpen ? 1 : 0 }}
      >
        <div className="faq-item__panel-inner">
          <p>{answer}</p>
        </div>
      </div>
    </article>
  );
}

function DesignBeforeAfterSlider() {
  const [position, setPosition] = useState(56);

  return (
    <div className="results-card design-reference__results-card">
      <div className="results-card__frame">
        <div className="results-card__surface">
          <img
            src={beforeImage}
            alt="Uneven concrete before leveling"
            className="results-card__image"
          />
          <div
            className="results-card__after"
            style={{ clipPath: `inset(0 0 0 ${position}%)` }}
          >
            <img
              src={afterImage}
              alt="Concrete after leveling and repair"
              className="results-card__image"
            />
          </div>
          <div
            className="results-card__divider"
            style={{ left: `${position}%` }}
            aria-hidden="true"
          >
            <span />
          </div>
          <div className="results-card__labels" aria-hidden="true">
            <span>Before</span>
            <span>After</span>
          </div>
          <input
            className="results-card__range"
            type="range"
            min="0"
            max="100"
            value={position}
            aria-label="Adjust the before and after comparison"
            onChange={(event) => setPosition(Number(event.target.value))}
          />
        </div>
      </div>
      <p className="results-card__caption">
        Signature comparison module with dark-band framing and direct proof.
      </p>
    </div>
  );
}

function DesignQuoteForm() {
  const fileHintId = useId();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <form className="quote-form" onSubmit={onSubmit}>
      <fieldset className="quote-form__fieldset">
        <div className="quote-form__grid">
          <label>
            Full Name
            <input type="text" placeholder="John Doe" />
          </label>
          <label>
            Phone Number
            <input type="tel" placeholder="(402) 000-0000" />
          </label>
          <label>
            Email Address
            <input type="email" placeholder="your@email.com" />
          </label>
          <label>
            Service Address
            <input type="text" placeholder="123 Omaha St. NE" />
          </label>
          <label>
            Square Feet of Slabs
            <input type="number" placeholder="Approx. 250" />
          </label>
        </div>

        <label>
          Upload Images
          <input type="file" aria-describedby={fileHintId} />
        </label>
        <p className="quote-form__hint" id={fileHintId}>
          Use the teal file button and keep helper copy calm and practical.
        </p>

        <label>
          Issue Description
          <textarea
            rows={5}
            placeholder="Describe the sunken area (driveway, patio, walkway...)"
          />
        </label>
      </fieldset>

      <p className="quote-form__status" aria-live="polite">
        Status messaging stays supportive, brief, and easy to scan.
      </p>

      <button type="submit" className="button button--primary button--block">
        Send Request
      </button>
    </form>
  );
}

function DesignPage() {
  return (
    <div className="design-reference">
      <header className="design-reference__hero">
        <div className="design-reference__hero-bar">
          <div className="design-reference__brand-lockup">
            <img src={headerLogo} alt="Rock Solid Leveling" />
            <span className="design-reference__eyebrow">Internal Design Reference</span>
          </div>

          <div className="design-reference__hero-actions">
            <span className="design-reference__path">/design.html</span>
            <a className="button button--secondary button--small" href="./">
              Back To Site
            </a>
          </div>
        </div>

        <div className="design-reference__hero-grid">
          <div className="design-reference__hero-copy">
            <p className="design-reference__kicker">Source of truth for future agents</p>
            <h1>Rock Solid visual system, distilled from the live site.</h1>
            <p className="hero__lede design-reference__lede">
              Use this page and <code>design.md</code> before introducing new
              sections, cards, buttons, or messaging treatments. The goal is to
              extend the current brand, not invent a second one.
            </p>

            <div className="hero__actions design-reference__hero-links">
              <a className="button button--primary" href="#components">
                Review Components
              </a>
              <a className="button button--secondary" href="#rules">
                Read Design Rules
              </a>
            </div>
          </div>

          <div className="design-reference__hero-art">
            <div className="design-reference__logo-card">
              <img className="hero__logo" src={heroLogo} alt="Rock Solid Leveling icon logo" />
            </div>
            <div className="design-reference__level-wrap">
              <img src={levelGraphic} alt="" aria-hidden="true" />
            </div>
          </div>
        </div>
      </header>

      <main className="design-reference__main">
        <section className="design-reference__section" id="brand">
          <div className="section-heading">
            <h2>Brand Foundations</h2>
            <p>
              The brand should feel practical, high-trust, locally grounded,
              and visibly tied to concrete work. Bright blue drives action,
              teal supports utility, and orange is a deliberate accent.
            </p>
          </div>

          <div className="design-reference__card-grid">
            <article className="design-reference__card">
              <h3>Logo Treatments</h3>
              <div className="design-reference__logo-grid">
                <div className="design-reference__logo-sample">
                  <span>Header lockup</span>
                  <img src={headerLogo} alt="Rock Solid Leveling horizontal logo" />
                </div>
                <div className="design-reference__logo-sample design-reference__logo-sample--dark">
                  <span>Footer lockup</span>
                  <img src={footerLogo} alt="Rock Solid Leveling address logo" />
                </div>
              </div>
            </article>

            <article className="design-reference__card">
              <h3>Color Tokens</h3>
              <div className="design-reference__token-grid">
                {colorTokens.map((token) => (
                  <div className="design-reference__token" key={token.token}>
                    <span
                      className="design-reference__swatch"
                      style={{ backgroundColor: token.value }}
                      aria-hidden="true"
                    />
                    <strong>{token.name}</strong>
                    <code>{token.token}</code>
                    <span>{token.value}</span>
                    <p>{token.note}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="design-reference__section">
          <div className="section-heading">
            <h2>Typography And Shape</h2>
            <p>
              Headings are tight, bold, and compact. Body copy is clear and
              generous. Corners stay rounded and shadows stay soft but present.
            </p>
          </div>

          <div className="design-reference__card-grid">
            <article className="design-reference__card">
              <h3>Type Scale</h3>
              <div className="design-reference__type-stack">
                <div>
                  <p className="design-reference__label">Display / Archivo</p>
                  <h1 className="design-reference__display">
                    Don&apos;t Replace It
                    <span>Rock Solid It.</span>
                  </h1>
                </div>
                <div>
                  <p className="design-reference__label">Section heading / Archivo</p>
                  <h2 className="design-reference__heading">Real Results. Solid Foundations.</h2>
                </div>
                <div>
                  <p className="design-reference__label">Body / Manrope</p>
                  <p className="hero__lede design-reference__body-copy">
                    Use warm but direct language, strong local-business clarity,
                    and concise proof-oriented supporting copy.
                  </p>
                </div>
              </div>
            </article>

            <article className="design-reference__card">
              <h3>Radius And Shadow</h3>
              <div className="design-reference__chip-row">
                {radiusTokens.map((token) => (
                  <div className="design-reference__stat" key={token.token}>
                    <strong>{token.label}</strong>
                    <code>{token.token}</code>
                    <span>{token.value}</span>
                  </div>
                ))}
              </div>
              <div className="design-reference__chip-row">
                {shadowTokens.map((token) => (
                  <div className="design-reference__stat design-reference__stat--shadow" key={token.token}>
                    <strong>{token.label}</strong>
                    <code>{token.token}</code>
                    <span>{token.value}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="design-reference__section" id="components">
          <div className="section-heading">
            <h2>Component Reference</h2>
            <p>
              These samples use the same classes and visual language as the live
              homepage so future work can stay visually consistent.
            </p>
          </div>

          <div className="design-reference__component-grid">
            <article className="design-reference__card">
              <h3>Buttons</h3>
              <div className="design-reference__button-stack">
                <div className="hero__actions design-reference__button-row">
                  <button type="button" className="button button--primary">
                    Primary CTA
                  </button>
                  <button type="button" className="button button--secondary">
                    Secondary CTA
                  </button>
                </div>
                <div className="hero__actions design-reference__button-row">
                  <button type="button" className="button button--primary button--small">
                    Small CTA
                  </button>
                  <button type="button" className="button button--primary button--block">
                    Full Width Mobile CTA
                  </button>
                </div>
              </div>
            </article>

            <article className="design-reference__card">
              <h3>Benefit Item</h3>
              <article className="benefit-item">
                <span className="benefit-item__icon" aria-hidden="true">
                  1
                </span>
                <div>
                  <h3>50-70% Cost Savings</h3>
                  <p>
                    Benefit modules use numbered circular markers, concise
                    headlines, and proof-heavy supporting text.
                  </p>
                </div>
              </article>
            </article>

            <article className="design-reference__card">
              <h3>Process Step</h3>
              <article className="process-step design-reference__process-step">
                <span className="process-step__number">2</span>
                <h3>Pump</h3>
                <p>
                  Process steps stay centered, short, and visually lightweight
                  with a numbered outline circle.
                </p>
              </article>
            </article>

            <article className="design-reference__card">
              <h3>FAQ Pattern</h3>
              <div className="faq-list design-reference__faq-list">
                <DesignFaqItem
                  question="What makes the FAQ pattern feel on-brand?"
                  answer="Rounded white cards, minimal borders, restrained motion, and concise answers with clear practical language."
                  defaultOpen
                />
                <DesignFaqItem
                  question="Should future accordions use the same treatment?"
                  answer="Yes. Reuse this structure unless there is a strong reason to introduce a different disclosure pattern."
                />
              </div>
            </article>
          </div>
        </section>

        <section className="results-band design-reference__band">
          <div className="section section--dark design-reference__dark-section">
            <div className="results-band__heading">
              <h2>Dark Proof Band</h2>
              <p>
                Reserve the navy band for the most persuasive proof or showcase
                content. It adds weight when used sparingly.
              </p>
            </div>

            <DesignBeforeAfterSlider />
          </div>
        </section>

        <section className="design-reference__section">
          <div className="section-heading">
            <h2>Forms And Trust Panels</h2>
            <p>
              Forms should feel supportive and low-friction, with strong labels,
              clean fields, and a blue header that frames the conversion moment.
            </p>
          </div>

          <div className="design-reference__card-grid">
            <div className="quote-card">
              <div className="quote-card__header">
                <h2>Request Your Free Estimate</h2>
                <p>High-trust conversion panel with clear visual hierarchy.</p>
              </div>
              <DesignQuoteForm />
            </div>

            <article className="design-reference__card design-reference__art-card">
              <h3>Supporting Artwork</h3>
              <p>
                Use concrete and tool imagery as structural accents rather than
                decorative clutter. Keep them crisp, grounded, and easy to scan.
              </p>
              <div className="design-reference__art-grid">
                <img src={levelGraphic} alt="Orange level brand graphic" />
                <img src={processSlabGraphic} alt="Concrete slab brand illustration" />
              </div>
            </article>
          </div>
        </section>

        <section className="design-reference__section" id="rules">
          <div className="section-heading">
            <h2>Implementation Rules</h2>
            <p>
              Keep future additions consistent with the existing marketing
              intent, brand signals, and deployment simplicity.
            </p>
          </div>

          <div className="design-reference__rules">
            {designRules.map((rule) => (
              <article className="design-reference__rule" key={rule}>
                <span className="benefit-item__icon" aria-hidden="true">
                  ✓
                </span>
                <p>{rule}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default DesignPage;
