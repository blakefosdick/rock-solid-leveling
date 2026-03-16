import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import "./app.css";
import heroLogo from "../images/logos/LogoSquareTextandImagepng.png";
import headerLogo from "../images/logos/TextandSlabsHorizontal.png";
import footerLogo from "../images/logos/textandaddress.svg";
import levelGraphic from "../images/logos/level.png";
import processSlabGraphic from "../images/logos/slab.png";
import { contactDetails } from "./content";

const beforeImage = "./media/before.jpg";
const afterImage = "./media/after.jpg";

const navLinks = [
  { href: "#services", label: "Services" },
  { href: "#process", label: "Our Process" },
  { href: "#results", label: "Results" }
];

const benefitItems = [
  {
    title: "50-70% Cost Savings",
    copy:
      "Lifting your existing concrete is often far more affordable than tearing it out and pouring new concrete."
  },
  {
    title: "Grout Pumping",
    copy:
      "We use a durable grout-based mix to fill voids, strengthen the soil, and restore support beneath the slab."
  },
  {
    title: "Eliminate Trip Hazards",
    copy:
      "Protect your family and visitors by leveling uneven sidewalks, driveways, patios, and approaches."
  }
];

const processSteps = [
  {
    number: "1",
    title: "Drill",
    copy:
      'We drill small, clean holes into the sunken concrete where lifting is needed.'
  },
  {
    number: "2",
    title: "Pump",
    copy:
      "Strong, soil-compacting grout is injected beneath the slab, expanding to fill voids and lift the concrete back to level."
  },
  {
    number: "3",
    title: "Patch",
    copy:
      "The holes are patched with cement and the surface is cleaned so you can walk or drive on it again quickly."
  }
];

const faqs = [
  {
    question: "What is the benefit of grout-based pumping?",
    answer:
      "Grout pumping fills voids, compacts weak soil, and gives settled concrete a denser support base than quick cosmetic fixes."
  },
  {
    question: "How does it compare to mudjacking?",
    answer:
      "Traditional mudjacking is a broader term, but our process focuses on a refined grout mix that is designed to create stronger support beneath the slab."
  },
  {
    question: "Is it better than foam injection?",
    answer:
      "When getting into concrete leveling we first researched the best method. It's a heavily debated topic but research tends to win out with grout. It's heavier and helps settle the soil, fills voids better than foam, cheaper than foam and better for the environment."
  },
  {
    question: "How long does it last?",
    answer:
      "Longevity depends on drainage and underlying soil conditions, but properly supported concrete can remain stable for years. We offer an 8 year warranty and lifetime warranty if we caulk the slabs."
  },
  {
    question: "How long before I can drive on it?",
    answer:
      "Most projects are ready for normal use fast, and many can be driven on by the next day."
  }
];

const footerLinks = [
  { href: "#services", label: "Services" },
  { href: "#process", label: "Our Process" },
  { href: "#results", label: "Before & After" },
  { href: "#estimate", label: "Free Estimate" },
  { href: "./terms-and-privacy.html", label: "Terms & Privacy" }
];

const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL?.trim() ?? "";
const n8nFormId = import.meta.env.VITE_N8N_FORM_ID?.trim() ?? "rock-solid-website";

const createSubmissionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `rsl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const splitFullName = (fullName: string) => {
  const trimmedName = fullName.trim();

  if (!trimmedName) {
    return { firstName: "", lastName: "" };
  }

  const [firstName, ...remainingNames] = trimmedName.split(/\s+/);

  return {
    firstName,
    lastName: remainingNames.join(" ")
  };
};

const createLegacyAddressBlock = (address: string) => {
  const trimmedAddress = address.trim();

  if (!trimmedAddress) {
    return "";
  }

  return [`Address line 1: ${trimmedAddress}`, "Country: United States"].join("\r\n");
};

type QuoteSubmission = {
  name: string;
  phone: string;
  email: string;
  address: string;
  squareFeet: string;
  details: string;
  images: File[];
};

const buildWebhookPayload = ({
  name,
  phone,
  email,
  address,
  squareFeet,
  details,
  images
}: QuoteSubmission) => {
  const submissionId = createSubmissionId();
  const { firstName, lastName } = splitFullName(name);
  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  const trimmedEmail = email.trim();
  const trimmedAddress = address.trim();
  const trimmedSquareFeet = squareFeet.trim();
  const trimmedDetails = details.trim();

  const rawRequest = {
    submitSource: "website",
    submitDate: Date.now().toString(),
    q11_name: {
      first: firstName,
      last: lastName
    },
    q12_phoneNumber: {
      full: trimmedPhone
    },
    q5_email5: trimmedEmail,
    q7_typeA: createLegacyAddressBlock(trimmedAddress),
    q13_number: trimmedSquareFeet,
    q17_anyNotes: trimmedDetails,
    q16_typeA16: "",
    q18_uploadedFiles: images.map((image) => image.name),
    path: "/website-quote"
  };

  const formData = new FormData();

  formData.append("formID", n8nFormId);
  formData.append("submissionID", submissionId);
  formData.append("formTitle", "Get a Quote");
  formData.append("type", "WEB");
  formData.append("webhookSource", "rocksolidleveling.com");
  formData.append("submittedAt", new Date().toISOString());
  formData.append(
    "pretty",
    [
      `Name:${trimmedName}`,
      `Phone Number:${trimmedPhone}`,
      `Email:${trimmedEmail}`,
      `Address:${trimmedAddress}`,
      `Square Feet of Slabs:${trimmedSquareFeet || "Not provided"}`,
      `Any notes or comments? :${trimmedDetails}`,
      `Images:${images.length > 0 ? images.map((image) => image.name).join(", ") : "None"}`
    ].join(", ")
  );
  formData.append("rawRequest", JSON.stringify(rawRequest));
  formData.append("fullName", trimmedName);
  formData.append("firstName", firstName);
  formData.append("lastName", lastName);
  formData.append("phone", trimmedPhone);
  formData.append("email", trimmedEmail);
  formData.append("address", trimmedAddress);
  formData.append("squareFeet", trimmedSquareFeet);
  formData.append("details", trimmedDetails);
  formData.append("imageCount", String(images.length));

  images.forEach((image) => {
    formData.append("images", image, image.name);
  });

  return formData;
};

function useRevealAnimations() {
  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]")
    );

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px"
      }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);
}

function BeforeAfterSlider() {
  const [position, setPosition] = useState(50);

  return (
    <div className="results-card" data-reveal>
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
        Drag the slider to compare before and after.
      </p>
    </div>
  );
}

function FaqItem({
  question,
  answer
}: {
  question: string;
  answer: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [answerHeight, setAnswerHeight] = useState(0);
  const answerRef = useRef<HTMLDivElement | null>(null);
  const buttonId = useId();
  const panelId = useId();

  useEffect(() => {
    const answerElement = answerRef.current;

    if (!answerElement) {
      return;
    }

    const updateHeight = () => {
      setAnswerHeight(answerElement.scrollHeight);
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateHeight);

      return () => window.removeEventListener("resize", updateHeight);
    }

    const resizeObserver = new ResizeObserver(() => updateHeight());
    resizeObserver.observe(answerElement);

    return () => resizeObserver.disconnect();
  }, []);

  const toggleItem = () => {
    const nextHeight = answerRef.current?.scrollHeight ?? 0;
    setAnswerHeight(nextHeight);
    setIsOpen((currentValue) => !currentValue);
  };

  return (
    <article className={`faq-item${isOpen ? " is-open" : ""}`}>
      <h3 className="faq-item__heading">
        <button
          id={buttonId}
          className="faq-item__trigger"
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={toggleItem}
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
        style={{ height: isOpen ? `${answerHeight}px` : "0px" }}
      >
        <div ref={answerRef} className="faq-item__panel-inner">
          <p>{answer}</p>
        </div>
      </div>
    </article>
  );
}

function QuoteForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [squareFeet, setSquareFeet] = useState("");
  const [details, setDetails] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const fileHintId = useId();
  const statusMessageId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setStatusMessage("");

    if (n8nWebhookUrl) {
      try {
        setIsSubmitting(true);

        const response = await fetch(n8nWebhookUrl, {
          method: "POST",
          body: buildWebhookPayload({
            name,
            phone,
            email,
            address,
            squareFeet,
            details,
            images
          })
        });

        if (!response.ok) {
          throw new Error(`Webhook request failed with status ${response.status}`);
        }

        setName("");
        setPhone("");
        setEmail("");
        setAddress("");
        setSquareFeet("");
        setDetails("");
        setImages([]);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        setStatusMessage("Thanks. Your estimate request was sent successfully.");
        return;
      } catch (error) {
        console.error("n8n webhook submission failed", error);
        setStatusMessage(
          "We could not send your request through the site right now. Your email draft is opening so you can still reach us."
        );
      } finally {
        setIsSubmitting(false);
      }
    }

    const requestSummary = [
      `Full Name: ${name}`,
      `Phone Number: ${phone}`,
      `Email Address: ${email}`,
      `Service Address: ${address}`,
      `Square Feet of Slabs: ${squareFeet || "Not provided"}`,
      `Selected Images: ${
        images.length > 0
          ? images.map((image) => image.name).join(", ")
          : "No images selected"
      }`,
      "",
      "Issue Description:",
      details
    ].join("\n");
    const subject = `Free estimate request from ${name}`;
    const shareData: ShareData = {
      title: subject,
      text: requestSummary
    };

    if (images.length > 0) {
      shareData.files = images;
    }

    if (
      images.length > 0 &&
      typeof navigator.share === "function" &&
      (typeof navigator.canShare !== "function" || navigator.canShare(shareData))
    ) {
      try {
        await navigator.share(shareData);
        setStatusMessage(
          "Your device share sheet opened so you can send the request with the selected images."
        );
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          setStatusMessage("Sharing was canceled. Your request details are still in the form.");
          return;
        }
      }
    }

    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(requestSummary);
    setStatusMessage(
      images.length > 0
        ? `Your email draft is opening now. If the selected photos are not attached automatically, please send them in a follow-up email or text to ${contactDetails.phoneDisplay}.`
        : "Your email draft is opening now."
    );
    window.location.href = `${contactDetails.emailHref}?subject=${encodedSubject}&body=${encodedBody}`;
  };

  return (
    <form className="quote-form" onSubmit={onSubmit}>
      <fieldset className="quote-form__fieldset" disabled={isSubmitting}>
        <div className="quote-form__grid">
          <label>
            Full Name
            <input
              type="text"
              name="name"
              placeholder="John Doe"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Phone Number
            <input
              type="tel"
              name="phone"
              placeholder="(402) 000-0000"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          <label>
            Email Address
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Service Address
            <input
              type="text"
              name="address"
              placeholder="123 Omaha St. NE"
              required
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </label>
          <label>
            Square Feet of Slabs
            <input
              type="number"
              name="squareFeet"
              inputMode="numeric"
              min="0"
              step="1"
              placeholder="Approx. 250"
              value={squareFeet}
              onChange={(event) => setSquareFeet(event.target.value)}
            />
          </label>
        </div>
        <label>
          Upload Images
          <input
            ref={fileInputRef}
            type="file"
            name="images"
            accept="image/*"
            multiple
            aria-describedby={fileHintId}
            onChange={(event) => {
              setImages(Array.from(event.target.files ?? []));
            }}
          />
        </label>
        <p className="quote-form__hint" id={fileHintId}>
          {n8nWebhookUrl
            ? "Add slab photos to help speed up quoting. The form now sends your request to the estimate workflow directly."
            : "Add slab photos to speed up quoting. On supported devices, the share sheet can send them with your request. Otherwise, your email draft will open and you can attach the photos manually."}
        </p>
        {images.length > 0 ? (
          <p className="quote-form__file-summary">
            {images.length} image{images.length === 1 ? "" : "s"} selected:{" "}
            {images.map((image) => image.name).join(", ")}
          </p>
        ) : null}
        <label>
          Issue Description
          <textarea
            name="details"
            rows={5}
            placeholder="Describe the sunken area (driveway, patio, walkway...)"
            required
            value={details}
            onChange={(event) => setDetails(event.target.value)}
          />
        </label>
      </fieldset>
      {statusMessage ? (
        <p className="quote-form__status" id={statusMessageId} aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
      <button type="submit" className="button button--primary button--block" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : n8nWebhookUrl ? "Send Request" : "Submit Request"}
      </button>
    </form>
  );
}

function App() {
  useRevealAnimations();

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <a href="#top" className="site-header__brand" aria-label="Rock Solid Leveling home">
            <img src={headerLogo} alt="Rock Solid Leveling" />
          </a>

          <nav className="site-nav" aria-label="Primary">
            <ul>
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <a className="site-header__cta button button--primary button--small" href="#estimate">
            Get A Free Quote
          </a>
        </div>
      </header>

      <main id="top">
        <section className="hero section">
          <div className="hero__logo-wrap" data-reveal>
            <img
              className="hero__logo"
              src={heroLogo}
              alt="Rock Solid Leveling logo"
            />
          </div>

          <div className="hero__copy" data-reveal>
            <h1>
              Don't Replace It
              <span>Rock Solid It.</span>
            </h1>
            <p className="hero__lede">
              Omaha&apos;s proven concrete leveling experts. We lift, level, and
              restore sunken concrete for a fraction of the cost of replacement
              using grout pumping. Grout is stronger, fills voids, and helps
              compact and settle soil.
            </p>
            <div className="hero__actions">
              <a className="button button--primary" href="#estimate">
                Get Your Free Estimate
              </a>
              <a className="button button--secondary" href="#process">
                See How It Works
              </a>
            </div>
          </div>
        </section>

        <section className="results-band" id="results">
          <div className="section section--dark">
            <div className="results-band__heading" data-reveal>
              <h2>Real Results. Solid Foundations.</h2>
              <p>
                See how we restore damaged concrete to usable condition in just
                a few hours.
              </p>
            </div>

            <BeforeAfterSlider />
          </div>
        </section>

        <section className="section section--tight" id="services">
          <div className="section-heading" data-reveal>
            <h2>Why Choose Rock Solid Leveling?</h2>
          </div>

          <div className="benefits-layout">
            <div className="benefits-list">
              {benefitItems.map((item, index) => (
                <article className="benefit-item" data-reveal key={item.title}>
                  <span className="benefit-item__icon" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.copy}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="benefits-art" data-reveal>
              <img src={levelGraphic} alt="" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section className="section" id="process">
          <div className="section-heading section-heading--center" data-reveal>
            <h2>Our Simple 3-Step Process</h2>
            <p>
              Fast, clean, and transparent. We respect your property and your
              time.
            </p>
          </div>

          <div className="process-grid">
            {processSteps.map((step) => (
              <article className="process-step" key={step.number} data-reveal>
                <span className="process-step__number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>

          <div className="process-slab" data-reveal>
            <img
              src={processSlabGraphic}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
            />
          </div>
        </section>

        <section className="section section--faq" id="faq">
          <div className="section-heading section-heading--center" data-reveal>
            <h2>Frequently Asked Questions</h2>
            <p>
              Expert answers to common questions about grout-based concrete
              leveling.
            </p>
          </div>

          <div className="faq-list">
            {faqs.map((faq) => (
              <div key={faq.question} data-reveal>
                <FaqItem question={faq.question} answer={faq.answer} />
              </div>
            ))}
          </div>
        </section>

        <section className="section estimate-section" id="estimate">
          <div className="quote-card" data-reveal>
            <div className="quote-card__header">
              <h2>Request Your Free Estimate</h2>
              <p>Professional concrete solutions for your home or business.</p>
            </div>
            <QuoteForm />
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="site-footer__brand">
            <div className="site-footer__logo-card">
              <img
                className="site-footer__logo-image"
                src={footerLogo}
                alt="Rock Solid Leveling with Omaha address and website"
              />
            </div>
            <p>
              Proudly serving Omaha and surrounding areas with professional,
              reliable, and cost-effective concrete lifting solutions.
            </p>
          </div>

          <div className="site-footer__column">
            <h3>Quick Links</h3>
            <ul>
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="site-footer__column">
            <h3>Contact Us</h3>
            <ul>
              <li>{contactDetails.city}</li>
              <li>
                <a href={contactDetails.phoneHref}>{contactDetails.phoneDisplay}</a>
              </li>
              <li>
                <a href={contactDetails.emailHref}>{contactDetails.email}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="site-footer__bottom">
          <p>&copy; 2026 Rock Solid Leveling. All Rights Reserved.</p>
          <p className="site-footer__legacy">
            Formerly R&amp;B Concrete Leveling and Repair
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
