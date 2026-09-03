import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import "./app.css";
import heroLogo from "../images/logos/LogoSquareTextandImagepng.png";
import headerLogo from "../images/logos/TextandSlabsHorizontal.png";
import footerLogo from "../images/logos/textandaddress.svg";
import levelGraphic from "../images/logos/level.png";
import processSlabGraphic from "../images/logos/slab.png";
import { captureEvent, captureException } from "./analytics";
import { contactDetails } from "./content";
import {
  createMetaLeadEventId,
  getMetaBrowserContext,
  getMetaViewContentEventId,
  sendMetaViewContent
} from "./metaCapi";
import {
  initMetaPixel,
  trackMetaPixelLead,
  trackMetaPixelViewContent
} from "./metaPixel";

const beforeImage = "./media/before.jpg";
const afterImage = "./media/after.jpg";
const freeEstimatePath = "/free-estimate";
const areasServedPath = "/areas-served";

const navLinks = [
  { href: "#services", label: "Services" },
  { href: "#process", label: "Our Process" },
  { href: "#results", label: "Results" },
  { href: "#reviews", label: "Reviews" },
  { href: "#faq", label: "FAQ" }
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

const concreteTypeOptions = [
  "Sidewalk",
  "Driveway",
  "Patio",
  "Steps",
  "Garage approach",
  "Garage floor",
  "Other"
];

const adTrustPoints = [
  "Locally owned",
  "Omaha-area service",
  "Insured",
  "Free estimates",
  "Quick return to use"
];

const adResultCards = [
  {
    title: "Sidewalk trip hazard lifted",
    copy: "Settled sidewalk panels can often be brought back to a safer, cleaner grade without tear-out."
  },
  {
    title: "Driveways, patios, and approaches",
    copy: "Grout-based leveling fills voids beneath existing concrete so good slabs can keep working."
  }
];

const primaryServiceAreas = [
  "Omaha",
  "Elkhorn",
  "Millard",
  "Bennington",
  "Boys Town",
  "Ralston",
  "La Vista",
  "Papillion",
  "Bellevue",
  "Gretna",
  "Waterloo",
  "Valley"
];

const nearbyServiceAreas = [
  "Council Bluffs, IA",
  "Carter Lake, IA",
  "Springfield",
  "Blair",
  "Plattsmouth",
  "Ashland",
  "Fremont"
];

const areaServiceTypes = [
  "Driveway leveling",
  "Driveway caulking",
  "Sidewalk and walkway leveling",
  "Patio and stoop lifting",
  "Expansion joints",
  "Garage approach repair",
  "Garage floor leveling",
  "Trip hazard removal"
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
      "Longevity depends on drainage and underlying soil conditions, but properly supported concrete can remain stable for years."
  },
  {
    question: "How long before I can drive on it?",
    answer:
      "Most projects are ready for normal use fast, and many can be driven on by the next day."
  }
];

const footerLinks = [
  { href: "#services", label: "Services" },
  { href: areasServedPath, label: "Areas Served" },
  { href: "#process", label: "Our Process" },
  { href: "#results", label: "Before & After" },
  { href: "#reviews", label: "Reviews" },
  { href: "#faq", label: "FAQ" },
  { href: "#estimate", label: "Free Estimate" },
  { href: "./terms-and-privacy.html", label: "Terms & Privacy" }
];

const n8nWebhookUrl = "/rock-solid-website-quote";
const n8nFormId = import.meta.env.VITE_N8N_FORM_ID?.trim() ?? "rock-solid-website";
const mapboxAccessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ?? "";
const googleReviewsUrl = "https://maps.app.goo.gl/13pJzDvta4psNmd76?g_st=ac";
const siteUrl = "https://rocksolidleveling.com";
const freeEstimateUrl = `${siteUrl}${freeEstimatePath}`;
const areasServedUrl = `${siteUrl}${areasServedPath}`;
const omahaProximity = "-95.9345,41.2565";

const serviceAreaSchema = [...primaryServiceAreas, ...nearbyServiceAreas].map((area) => ({
  "@type": "City",
  name: area.includes(",") ? area : `${area}, Nebraska`
}));

const freeEstimateStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "HomeAndConstructionBusiness",
      "@id": `${siteUrl}/#business`,
      name: "Rock Solid Leveling",
      alternateName: "R&B Concrete Leveling and Repair",
      url: siteUrl,
      telephone: "+1-402-682-8151",
      email: "info@rocksolidleveling.com",
      areaServed: serviceAreaSchema,
      makesOffer: {
        "@type": "Offer",
        name: "Free concrete leveling estimate",
        areaServed: serviceAreaSchema,
        itemOffered: {
          "@type": "Service",
          name: "Concrete leveling",
          serviceType: "Sidewalk, driveway, patio, steps, and garage approach leveling"
        }
      }
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer
        }
      }))
    }
  ]
};

const areasServedStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "HomeAndConstructionBusiness",
      "@id": `${siteUrl}/#business`,
      name: "Rock Solid Leveling",
      alternateName: "R&B Concrete Leveling and Repair",
      url: siteUrl,
      telephone: "+1-402-682-8151",
      email: "info@rocksolidleveling.com",
      image: `${siteUrl}/og-image.svg`,
      priceRange: "$$",
      areaServed: serviceAreaSchema,
      makesOffer: {
        "@type": "Offer",
        name: "Concrete leveling and lifting",
        areaServed: serviceAreaSchema,
        itemOffered: {
          "@type": "Service",
          name: "Concrete leveling",
          serviceType: "Driveway, sidewalk, patio, steps, garage approach, and garage floor leveling"
        }
      }
    },
    {
      "@type": "WebPage",
      "@id": `${areasServedUrl}#webpage`,
      url: areasServedUrl,
      name: "Concrete Leveling Areas Served | Rock Solid Leveling",
      description:
        "Rock Solid Leveling serves Omaha and nearby communities with grout-based concrete leveling for driveways, sidewalks, patios, steps, and garage approaches.",
      isPartOf: {
        "@type": "WebSite",
        name: "Rock Solid Leveling",
        url: siteUrl
      },
      about: {
        "@id": `${siteUrl}/#business`
      }
    }
  ]
};

type SiteConfig = {
  showGoogleReviews?: boolean;
};

type GoogleReviewCard = {
  id: string;
  authorName: string;
  relativeTime: string;
  comment: string;
  rating: number;
  profilePhotoUrl?: string;
};

type GoogleReviewsResponse = {
  success: boolean;
  reviews?: GoogleReviewCard[];
  averageRating?: number;
  totalReviewCount?: number;
};

type MapboxSuggestion = {
  mapbox_id: string;
  name: string;
  address?: string;
  full_address?: string;
  place_formatted?: string;
  context?: {
    postcode?: {
      name?: string;
    };
  };
};

type MapboxSuggestResponse = {
  suggestions?: MapboxSuggestion[];
};

type MapboxRetrieveResponse = {
  features?: Array<{
    properties?: {
      address?: string;
      full_address?: string;
      name?: string;
      context?: {
        postcode?: {
          name?: string;
        };
      };
    };
  }>;
};

const googleReviewFallbackCards: GoogleReviewCard[] = [
  {
    id: "fallback-1",
    authorName: "Google reviewer",
    relativeTime: "Recent review",
    rating: 5,
    comment:
      "See current customer feedback for Rock Solid Leveling directly on the Google Business Profile."
  },
  {
    id: "fallback-2",
    authorName: "Omaha homeowner",
    relativeTime: "Recent review",
    rating: 5,
    comment:
      "Google reviews give visitors a live look at customer experiences with scheduling, communication, and concrete repairs."
  },
  {
    id: "fallback-3",
    authorName: "Local customer",
    relativeTime: "Recent review",
    rating: 5,
    comment:
      "Past customers can use the same Google profile to leave a review after their driveway, walkway, patio, or slab repair."
  }
];

const reviewPreviewCharacterLimit = 260;

const createReviewPreview = (comment: string) => {
  if (comment.length <= reviewPreviewCharacterLimit) {
    return comment;
  }

  const wordBoundary = comment.lastIndexOf(" ", reviewPreviewCharacterLimit);
  const previewEnd = wordBoundary > reviewPreviewCharacterLimit * 0.7
    ? wordBoundary
    : reviewPreviewCharacterLimit;

  return `${comment.slice(0, previewEnd).trim()}...`;
};

const createSubmissionId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `rsl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getDefaultGoogleReviewsVisibility = () =>
  String(import.meta.env.VITE_GOOGLE_REVIEWS_ENABLED ?? "").toLowerCase() === "true";

const createSearchSessionToken = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `rsl-mapbox-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const formatMapboxSuggestion = (suggestion: MapboxSuggestion) =>
  suggestion.full_address ||
  [suggestion.address || suggestion.name, suggestion.place_formatted]
    .filter(Boolean)
    .join(", ");

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

const trackingParamNames = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
  "fbclid",
  "gclid",
  "msclkid"
];

const attributionStorageKey = "rsl_lead_attribution";

const getCurrentPath = () => {
  if (typeof window === "undefined") {
    return "/";
  }

  return window.location.pathname || "/";
};

const getCurrentPageUrl = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.location.href;
};

const readTrackingParamsFromUrl = () => {
  if (typeof window === "undefined") {
    return {} as Record<string, string>;
  }

  const params = new URLSearchParams(window.location.search);
  const trackingParams: Record<string, string> = {};

  trackingParamNames.forEach((name) => {
    const value = params.get(name)?.trim();
    if (value) {
      trackingParams[name] = value;
    }
  });

  return trackingParams;
};

const getLeadAttribution = () => {
  const currentParams = readTrackingParamsFromUrl();
  let storedParams: Record<string, string> = {};

  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      storedParams = JSON.parse(
        window.sessionStorage.getItem(attributionStorageKey) || "{}"
      ) as Record<string, string>;
    } catch {
      storedParams = {};
    }

    const nextParams = { ...storedParams, ...currentParams };
    if (Object.keys(currentParams).length > 0) {
      window.sessionStorage.setItem(attributionStorageKey, JSON.stringify(nextParams));
    }

    return nextParams;
  }

  return currentParams;
};

const upsertNamedMeta = (name: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.name = name;
    document.head.appendChild(element);
  }

  element.content = content;
};

const upsertPropertyMeta = (property: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.appendChild(element);
  }

  element.content = content;
};

const upsertCanonical = (href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }

  element.href = href;
};

function usePageMetadata({
  title,
  description,
  canonicalUrl,
  structuredData
}: {
  title: string;
  description: string;
  canonicalUrl: string;
  structuredData: Record<string, unknown>;
}) {
  useEffect(() => {
    document.title = title;
    upsertNamedMeta("description", description);
    upsertCanonical(canonicalUrl);
    upsertPropertyMeta("og:title", title);
    upsertPropertyMeta("og:description", description);
    upsertPropertyMeta("og:url", canonicalUrl);
    upsertNamedMeta("twitter:title", title);
    upsertNamedMeta("twitter:description", description);

    const scriptId = "page-structured-data";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }

    script.text = JSON.stringify(structuredData);
  }, [canonicalUrl, description, structuredData, title]);
}

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
  zipCode: string;
  concreteTypes: string[];
  images: File[];
  submissionSource: string;
  formTitle: string;
};

type QuoteWebhookPayload = {
  formData: FormData;
  metaLeadEventId: string;
};

const buildWebhookPayload = ({
  name,
  phone,
  email,
  address,
  squareFeet,
  details,
  zipCode,
  concreteTypes,
  images,
  submissionSource,
  formTitle
}: QuoteSubmission): QuoteWebhookPayload => {
  const submissionId = createSubmissionId();
  const metaLeadEventId = createMetaLeadEventId(submissionId);
  const metaContext = getMetaBrowserContext();
  const attribution = getLeadAttribution();
  const { firstName, lastName } = splitFullName(name);
  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  const trimmedEmail = email.trim();
  const trimmedAddress = address.trim();
  const trimmedSquareFeet = squareFeet.trim();
  const trimmedDetails = details.trim();
  const trimmedZipCode = zipCode.trim();
  const selectedConcreteTypes = concreteTypes.map((type) => type.trim()).filter(Boolean);
  const concreteTypeSummary = selectedConcreteTypes.join(", ");
  const sourcePath = getCurrentPath();
  const normalizedDetails = [
    trimmedDetails,
    concreteTypeSummary ? `Concrete types: ${concreteTypeSummary}` : "",
    trimmedZipCode ? `ZIP code: ${trimmedZipCode}` : ""
  ].filter(Boolean).join("\n");

  const rawRequest = {
    submitSource: submissionSource,
    pageUrl: getCurrentPageUrl(),
    attribution,
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
    zip: trimmedZipCode,
    postalCode: trimmedZipCode,
    q13_number: trimmedSquareFeet,
    q17_anyNotes: normalizedDetails,
    concreteType: concreteTypeSummary,
    concreteTypes: selectedConcreteTypes,
    q16_typeA16: "",
    q18_uploadedFiles: images.map((image) => image.name),
    path: sourcePath
  };

  const formData = new FormData();

  formData.append("formID", n8nFormId);
  formData.append("submissionID", submissionId);
  formData.append("formTitle", formTitle);
  formData.append("type", "WEB");
  formData.append("webhookSource", "rocksolidleveling.com");
  formData.append("submittedAt", new Date().toISOString());
  formData.append("metaEventId", metaLeadEventId);
  formData.append("metaLeadEventId", metaLeadEventId);
  formData.append("metaEventSourceUrl", metaContext.eventSourceUrl);
  formData.append("fbp", metaContext.fbp);
  formData.append("fbc", metaContext.fbc);
  formData.append("submitSource", submissionSource);
  formData.append("pagePath", sourcePath);
  formData.append("pageUrl", getCurrentPageUrl());
  formData.append(
    "pretty",
    [
      `Name:${trimmedName}`,
      `Phone Number:${trimmedPhone}`,
      `Email:${trimmedEmail}`,
      `Address:${trimmedAddress}`,
      `ZIP Code:${trimmedZipCode}`,
      `Concrete Types:${concreteTypeSummary}`,
      `Square Feet of Slabs:${trimmedSquareFeet || "Not provided"}`,
      `Any notes or comments? :${normalizedDetails}`,
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
  formData.append("zip", trimmedZipCode);
  formData.append("postalCode", trimmedZipCode);
  formData.append("concreteType", concreteTypeSummary);
  selectedConcreteTypes.forEach((type) => {
    formData.append("concreteTypes", type);
  });
  formData.append("squareFeet", trimmedSquareFeet);
  formData.append("details", normalizedDetails);
  formData.append("imageCount", String(images.length));

  Object.entries(attribution).forEach(([key, value]) => {
    formData.append(key, value);
  });

  images.forEach((image) => {
    formData.append("images", image, image.name);
  });

  return {
    formData,
    metaLeadEventId
  };
};

function useRevealAnimations(refreshKey: unknown) {
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
  }, [refreshKey]);
}

function useSiteConfig() {
  const [showGoogleReviews, setShowGoogleReviews] = useState(
    getDefaultGoogleReviewsVisibility
  );

  useEffect(() => {
    let isMounted = true;

    const loadSiteConfig = async () => {
      try {
        const response = await fetch("/site-config");
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as SiteConfig;

        if (isMounted && typeof payload.showGoogleReviews === "boolean") {
          setShowGoogleReviews(payload.showGoogleReviews);
        }
      } catch (error) {
        console.warn("Site config unavailable", error);
      }
    };

    void loadSiteConfig();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    showGoogleReviews
  };
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

function GoogleReviewsCarousel() {
  const [reviews, setReviews] = useState<GoogleReviewCard[]>(googleReviewFallbackCards);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"next" | "previous">("next");
  const [transitionId, setTransitionId] = useState(0);
  const [expandedReviewIds, setExpandedReviewIds] = useState<Set<string>>(() => new Set());
  const starSlots = [1, 2, 3, 4, 5];

  useEffect(() => {
    let isMounted = true;

    const loadReviews = async () => {
      try {
        const response = await fetch("/google-reviews");
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as GoogleReviewsResponse;
        const liveReviews = payload.reviews?.filter((review) => review.comment.trim());

        if (isMounted && liveReviews && liveReviews.length > 0) {
          setReviews(liveReviews);
          setActiveIndex(0);
        }
      } catch (error) {
        console.warn("Google reviews feed unavailable", error);
      }
    };

    void loadReviews();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleReviews = Array.from(
    { length: Math.min(3, reviews.length) },
    (_, offset) => reviews[(activeIndex + offset) % reviews.length]
  );

  const showReviewAtIndex = (nextIndex: number) => {
    if (nextIndex === activeIndex) {
      return;
    }

    const forwardDistance = (nextIndex - activeIndex + reviews.length) % reviews.length;
    const backwardDistance = (activeIndex - nextIndex + reviews.length) % reviews.length;

    setSlideDirection(forwardDistance <= backwardDistance ? "next" : "previous");
    setActiveIndex(nextIndex);
    setTransitionId((currentId) => currentId + 1);
  };

  const showPreviousReview = () => {
    setSlideDirection("previous");
    setActiveIndex((currentIndex) =>
      currentIndex === 0 ? reviews.length - 1 : currentIndex - 1
    );
    setTransitionId((currentId) => currentId + 1);
  };

  const showNextReview = () => {
    setSlideDirection("next");
    setActiveIndex((currentIndex) =>
      currentIndex === reviews.length - 1 ? 0 : currentIndex + 1
    );
    setTransitionId((currentId) => currentId + 1);
  };

  const toggleExpandedReview = (reviewId: string) => {
    setExpandedReviewIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(reviewId)) {
        nextIds.delete(reviewId);
      } else {
        nextIds.add(reviewId);
      }

      return nextIds;
    });
  };

  return (
    <div className="reviews-carousel" data-reveal>
      <button
        className="reviews-carousel__arrow reviews-carousel__arrow--prev"
        type="button"
        aria-label="Show previous reviews"
        onClick={showPreviousReview}
      >
        <span aria-hidden="true" />
      </button>

      <div
        className={`reviews-carousel__viewport reviews-carousel__viewport--${slideDirection}`}
        aria-live="polite"
        key={transitionId}
      >
        {visibleReviews.map((review, index) => {
          const canExpand = review.comment.length > reviewPreviewCharacterLimit;
          const isExpanded = expandedReviewIds.has(review.id);
          const displayedComment = canExpand && !isExpanded
            ? createReviewPreview(review.comment)
            : review.comment;

          return (
          <article
            className={`reviews-carousel__card${isExpanded ? " is-expanded" : ""}`}
            key={review.id}
            style={{ "--review-card-index": index } as CSSProperties}
          >
            <div className="reviews-carousel__header">
              {review.profilePhotoUrl ? (
                <img
                  className="reviews-carousel__avatar"
                  src={review.profilePhotoUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="reviews-carousel__avatar" aria-hidden="true">
                  {review.authorName.trim().charAt(0).toUpperCase() || "G"}
                </span>
              )}
              <div>
                <h3>{review.authorName}</h3>
                <p>{review.relativeTime}</p>
              </div>
            </div>

            <p className="reviews-carousel__quote">{displayedComment}</p>

            {canExpand ? (
              <button
                className="reviews-carousel__read-more"
                type="button"
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? "Collapse" : "Expand"} review from ${review.authorName}`}
                onClick={() => toggleExpandedReview(review.id)}
              >
                {isExpanded ? "Show less" : "Read more"}
              </button>
            ) : null}

            <div className="reviews-carousel__footer">
              <div
                className="reviews-carousel__stars"
                aria-label={`${review.rating} out of 5 stars`}
              >
                {starSlots.map((starValue) => (
                  <span
                    key={starValue}
                    className={starValue <= review.rating ? "is-filled" : ""}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <a
                className="reviews-carousel__google-mark"
                href={googleReviewsUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Open Rock Solid Leveling Google reviews"
              >
                G
              </a>
            </div>
          </article>
          );
        })}
      </div>

      <button
        className="reviews-carousel__arrow reviews-carousel__arrow--next"
        type="button"
        aria-label="Show next reviews"
        onClick={showNextReview}
      >
        <span aria-hidden="true" />
      </button>

      <div className="reviews-carousel__controls" aria-label="Google reviews carousel controls">
        <div className="reviews-carousel__dots" role="tablist" aria-label="Review slides">
          {reviews.map((review, index) => (
            <button
              key={review.id}
              type="button"
              role="tab"
              aria-label={`Show reviews starting with ${review.authorName}`}
              aria-selected={index === activeIndex}
              className={index === activeIndex ? "is-active" : ""}
              onClick={() => showReviewAtIndex(index)}
            />
          ))}
        </div>
      </div>
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
    setIsOpen((currentValue) => {
      if (!currentValue) {
        captureEvent("faq_expanded", { question });
      }
      return !currentValue;
    });
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

function AddressAutocompleteInput({
  address,
  zipCode,
  onAddressChange,
  onZipCodeChange,
  variant,
  submissionSource
}: {
  address: string;
  zipCode: string;
  onAddressChange: (value: string) => void;
  onZipCodeChange: (value: string) => void;
  variant: string;
  submissionSource: string;
}) {
  const listboxId = useId();
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedAddressRef = useRef("");
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [sessionToken, setSessionToken] = useState(createSearchSessionToken);

  const canAutocomplete = Boolean(mapboxAccessToken);

  useEffect(() => {
    const trimmedAddress = address.trim();

    if (
      !canAutocomplete ||
      trimmedAddress.length < 3 ||
      trimmedAddress === selectedAddressRef.current
    ) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const abortController = new AbortController();
    const debounceTimer = window.setTimeout(() => {
      const loadSuggestions = async () => {
        const suggestUrl = new URL("https://api.mapbox.com/search/searchbox/v1/suggest");
        suggestUrl.searchParams.set("q", trimmedAddress);
        suggestUrl.searchParams.set("access_token", mapboxAccessToken);
        suggestUrl.searchParams.set("session_token", sessionToken);
        suggestUrl.searchParams.set("country", "US");
        suggestUrl.searchParams.set("types", "address");
        suggestUrl.searchParams.set("language", "en");
        suggestUrl.searchParams.set("limit", "5");
        suggestUrl.searchParams.set("proximity", omahaProximity);

        try {
          setIsLoadingSuggestions(true);
          const response = await fetch(suggestUrl.toString(), {
            signal: abortController.signal
          });

          if (!response.ok) {
            throw new Error(`Mapbox suggest failed with status ${response.status}`);
          }

          const payload = (await response.json()) as MapboxSuggestResponse;
          const nextSuggestions = (payload.suggestions ?? []).filter(
            (suggestion) => suggestion.mapbox_id && formatMapboxSuggestion(suggestion)
          );

          setSuggestions(nextSuggestions);
          setActiveIndex(nextSuggestions.length > 0 ? 0 : -1);
          setIsOpen(nextSuggestions.length > 0);
        } catch (error) {
          if (!abortController.signal.aborted) {
            console.warn("Mapbox address suggestions unavailable", error);
            setSuggestions([]);
            setIsOpen(false);
          }
        } finally {
          if (!abortController.signal.aborted) {
            setIsLoadingSuggestions(false);
          }
        }
      };

      void loadSuggestions();
    }, 220);

    return () => {
      window.clearTimeout(debounceTimer);
      abortController.abort();
    };
  }, [address, canAutocomplete, sessionToken]);

  const selectSuggestion = async (suggestion: MapboxSuggestion) => {
    const fallbackAddress = suggestion.address || suggestion.name || formatMapboxSuggestion(suggestion);
    const fallbackZip = suggestion.context?.postcode?.name || zipCode;

    selectedAddressRef.current = fallbackAddress.trim();
    setIsOpen(false);
    setSuggestions([]);
    onAddressChange(fallbackAddress);
    if (fallbackZip) {
      onZipCodeChange(fallbackZip);
    }

    if (!mapboxAccessToken) {
      return;
    }

    try {
      const retrieveUrl = new URL(
        `https://api.mapbox.com/search/searchbox/v1/retrieve/${encodeURIComponent(suggestion.mapbox_id)}`
      );
      retrieveUrl.searchParams.set("access_token", mapboxAccessToken);
      retrieveUrl.searchParams.set("session_token", sessionToken);
      retrieveUrl.searchParams.set("language", "en");

      const response = await fetch(retrieveUrl.toString());
      if (!response.ok) {
        throw new Error(`Mapbox retrieve failed with status ${response.status}`);
      }

      const payload = (await response.json()) as MapboxRetrieveResponse;
      const properties = payload.features?.[0]?.properties;
      const retrievedAddress = properties?.address || properties?.name || fallbackAddress;
      const retrievedZip = properties?.context?.postcode?.name || fallbackZip;

      selectedAddressRef.current = retrievedAddress.trim();
      onAddressChange(retrievedAddress);
      if (retrievedZip) {
        onZipCodeChange(retrievedZip);
      }

      captureEvent("address_autocomplete_selected", {
        form_variant: variant,
        source: submissionSource,
        page_path: getCurrentPath(),
        has_zip: Boolean(retrievedZip)
      });
    } catch (error) {
      console.warn("Mapbox address retrieve unavailable", error);
    } finally {
      setSessionToken(createSearchSessionToken());
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((currentIndex) => (currentIndex + 1) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((currentIndex) =>
        currentIndex <= 0 ? suggestions.length - 1 : currentIndex - 1
      );
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      void selectSuggestion(suggestions[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div
      className="quote-form__autocomplete"
      ref={containerRef}
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <label htmlFor={inputId}>Service Address</label>
      <input
        id={inputId}
        type="text"
        name="address"
        autoComplete="street-address"
        placeholder="123 Omaha St."
        required
        value={address}
        role={canAutocomplete ? "combobox" : undefined}
        aria-autocomplete={canAutocomplete ? "list" : undefined}
        aria-expanded={canAutocomplete ? isOpen : undefined}
        aria-controls={canAutocomplete ? listboxId : undefined}
        aria-activedescendant={
          canAutocomplete && activeIndex >= 0
            ? `${listboxId}-option-${activeIndex}`
            : undefined
        }
        onChange={(event) => onAddressChange(event.target.value)}
        onInput={() => {
          selectedAddressRef.current = "";
        }}
        onFocus={() => {
          if (suggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
      />
      {canAutocomplete && isOpen ? (
        <div className="quote-form__suggestions" id={listboxId} role="listbox">
          {suggestions.map((suggestion, index) => (
            <button
              id={`${listboxId}-option-${index}`}
              className={index === activeIndex ? "is-active" : ""}
              key={suggestion.mapbox_id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => void selectSuggestion(suggestion)}
            >
              {formatMapboxSuggestion(suggestion)}
            </button>
          ))}
        </div>
      ) : null}
      {canAutocomplete && isLoadingSuggestions ? (
        <span className="quote-form__autocomplete-status" aria-live="polite">
          Looking up addresses...
        </span>
      ) : null}
    </div>
  );
}

type QuoteFormProps = {
  variant?: "full" | "ad";
  submissionSource?: string;
  submitLabel?: string;
  successMessage?: string;
};

function QuoteForm({
  variant = "full",
  submissionSource = "website",
  submitLabel,
  successMessage = "Thanks. Your estimate request was sent successfully."
}: QuoteFormProps = {}) {
  const isAdForm = variant === "ad";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [squareFeet, setSquareFeet] = useState("");
  const [details, setDetails] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [concreteTypes, setConcreteTypes] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const fileHintId = useId();
  const statusMessageId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasStartedFormRef = useRef(false);

  const trackFormStarted = () => {
    if (hasStartedFormRef.current) {
      return;
    }

    hasStartedFormRef.current = true;
    captureEvent("quote_form_started", {
      form_variant: variant,
      source: submissionSource,
      page_path: getCurrentPath()
    });
  };

  const toggleConcreteType = (option: string) => {
    setConcreteTypes((currentTypes) =>
      currentTypes.includes(option)
        ? currentTypes.filter((type) => type !== option)
        : [...currentTypes, option]
    );
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setStatusMessage("");

    if (!n8nWebhookUrl) {
      setStatusMessage(
        "This form endpoint is not configured yet. Please call or email us while we finish setup."
      );
      return;
    }

    if (isAdForm && concreteTypes.length === 0) {
      setStatusMessage("Please select at least one type of concrete.");
      captureEvent("quote_form_validation_failed", {
        form_variant: variant,
        source: submissionSource,
        page_path: getCurrentPath(),
        field: "concreteTypes"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const quotePayload = buildWebhookPayload({
        name,
        phone,
        email,
        address,
        squareFeet,
        details,
        zipCode,
        concreteTypes,
        images,
        submissionSource,
        formTitle: isAdForm ? "Meta Ad Free Estimate" : "Get a Quote"
      });

      const response = await fetch(n8nWebhookUrl, {
        method: "POST",
        body: quotePayload.formData
      });

      if (!response.ok) {
        const responseText = await response.text();
        let detail = responseText.trim();

        try {
          const parsed = JSON.parse(responseText) as { message?: string; detail?: string };
          if (parsed?.detail || parsed?.message) {
            detail = [parsed.message, parsed.detail].filter(Boolean).join(" | ");
          }
        } catch {
          // Keep raw response text when JSON parsing fails.
        }

        throw new Error(
          `Webhook request failed with status ${response.status}${detail ? `: ${detail}` : ""}`
        );
      }

      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setSquareFeet("");
      setDetails("");
      setZipCode("");
      setConcreteTypes([]);
      setImages([]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      captureEvent("quote_form_submitted", {
        form_variant: variant,
        source: submissionSource,
        page_path: getCurrentPath(),
        has_images: images.length > 0,
        image_count: images.length,
        has_square_feet: squareFeet.trim().length > 0,
        has_zip: zipCode.trim().length > 0,
        concrete_type: concreteTypes.join(", ") || undefined
      });
      trackMetaPixelLead(quotePayload.metaLeadEventId);
      setStatusMessage(successMessage);
    } catch (error) {
      console.error("Quote webhook submission failed", error);
      const detail = error instanceof Error ? error.message : "Unknown error";
      captureEvent("quote_form_submission_failed", {
        form_variant: variant,
        source: submissionSource,
        page_path: getCurrentPath(),
        error_detail: detail
      });
      captureException(error instanceof Error ? error : new Error(detail));
      if (detail.includes("status 404")) {
        setStatusMessage(
          "Submission endpoint not found (404). The Cloudflare function may not be deployed yet."
        );
      } else {
        setStatusMessage(`We could not submit your request right now (${detail}).`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <form className="quote-form" onFocusCapture={trackFormStarted} onSubmit={onSubmit}>
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
          {isAdForm ? (
            <>
              <label>
                ZIP Code
                <input
                  type="text"
                  name="zip"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="68144"
                  pattern="[0-9]{5}(-[0-9]{4})?"
                  required
                  value={zipCode}
                  onChange={(event) => setZipCode(event.target.value)}
                />
              </label>
              <AddressAutocompleteInput
                address={address}
                zipCode={zipCode}
                onAddressChange={setAddress}
                onZipCodeChange={setZipCode}
                variant={variant}
                submissionSource={submissionSource}
              />
              <div className="quote-form__choice-group">
                <span className="quote-form__choice-label">Type of Concrete</span>
                <div className="quote-form__choices">
                  {concreteTypeOptions.map((option) => (
                    <label className="quote-form__choice" key={option}>
                      <input
                        type="checkbox"
                        name="concreteTypes"
                        value={option}
                        checked={concreteTypes.includes(option)}
                        onChange={() => toggleConcreteType(option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label>
                Square Feet (Optional)
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
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
        <label>
          {isAdForm ? "Upload Photos (Optional)" : "Upload Images"}
          <input
            ref={fileInputRef}
            type="file"
            name="images"
            accept="image/*"
            multiple
            aria-describedby={fileHintId}
            onChange={(event) => {
              const selectedImages = Array.from(event.target.files ?? []);
              setImages(selectedImages);
              if (selectedImages.length > 0) {
                captureEvent("quote_form_photo_uploaded", {
                  form_variant: variant,
                  source: submissionSource,
                  page_path: getCurrentPath(),
                  image_count: selectedImages.length
                });
              }
            }}
          />
        </label>
        <p className="quote-form__hint" id={fileHintId}>
          {isAdForm
            ? "Photos are optional, but they can help us estimate the repair faster."
            : n8nWebhookUrl
            ? "Add slab photos to help speed up quoting. The form now sends your request to the estimate workflow directly."
            : "Add slab photos to speed up quoting. On supported devices, the share sheet can send them with your request. Otherwise, your email draft will open and you can attach the photos manually."}
        </p>
        {images.length > 0 ? (
          <p className="quote-form__file-summary">
            {images.length} image{images.length === 1 ? "" : "s"} selected:{" "}
            {images.map((image) => image.name).join(", ")}
          </p>
        ) : null}
        {isAdForm ? null : (
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
        )}
      </fieldset>
      {statusMessage ? (
        <p className="quote-form__status" id={statusMessageId} aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
      <button type="submit" className="button button--primary button--block" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : submitLabel ?? (n8nWebhookUrl ? "Send Request" : "Submit Request")}
      </button>
    </form>
  );
}

function FreeEstimatePage({ showGoogleReviews }: { showGoogleReviews: boolean }) {
  usePageMetadata({
    title: "Free Concrete Leveling Estimate in Omaha | Rock Solid Leveling",
    description:
      "Get a free Omaha concrete leveling estimate for sidewalks, driveways, patios, steps, and garage approaches. Often 50-70% less than replacement.",
    canonicalUrl: freeEstimateUrl,
    structuredData: freeEstimateStructuredData
  });

  useEffect(() => {
    getLeadAttribution();
  }, []);

  return (
    <div className="ad-shell">
      <header className="ad-header">
        <a className="ad-header__brand" href="/" aria-label="Rock Solid Leveling home">
          <img src={headerLogo} alt="Rock Solid Leveling" />
        </a>
        <a
          className="ad-header__phone"
          href={contactDetails.phoneHref}
          onClick={() =>
            captureEvent("phone_number_clicked", {
              location: "free_estimate_header",
              page_path: freeEstimatePath
            })
          }
        >
          {contactDetails.phoneDisplay}
        </a>
      </header>

      <main>
        <section className="ad-hero">
          <div className="ad-hero__copy" data-reveal>
            <p className="ad-eyebrow">Free Omaha concrete leveling estimate</p>
            <h1>Don&apos;t Pay to Replace Sunken Concrete.</h1>
            <p className="ad-hero__lede">
              Rock Solid Leveling provides concrete leveling in Omaha for sidewalks,
              driveways, patios, steps, and garage approaches, often for 50-70%
              less than replacement.
            </p>
            <div className="ad-hero__actions">
              <a
                className="button button--primary"
                href="#free-estimate-form"
                onClick={() =>
                  captureEvent("cta_clicked", {
                    label: "Get My Free Estimate",
                    location: "free_estimate_hero",
                    page_path: freeEstimatePath
                  })
                }
              >
                Get My Free Estimate
              </a>
              <a
                className="button button--secondary"
                href={contactDetails.phoneHref}
                onClick={() =>
                  captureEvent("phone_number_clicked", {
                    location: "free_estimate_hero",
                    page_path: freeEstimatePath
                  })
                }
              >
                Call {contactDetails.phoneDisplay}
              </a>
            </div>
            <ul className="ad-trust-list" aria-label="Trust points">
              {adTrustPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>

          <div className="ad-hero__media" data-reveal>
            <div className="ad-comparison" aria-label="Sidewalk before and after concrete leveling">
              <figure>
                <img
                  src={beforeImage}
                  alt="Uneven sidewalk concrete before leveling"
                  fetchPriority="high"
                />
                <figcaption>Before</figcaption>
              </figure>
              <figure>
                <img
                  src={afterImage}
                  alt="Sidewalk concrete after leveling"
                  fetchPriority="high"
                />
                <figcaption>After</figcaption>
              </figure>
            </div>
          </div>
        </section>

        <section className="ad-form-band" id="free-estimate-form">
          <div className="ad-form-card" data-reveal>
            <div className="ad-form-card__header">
              <h2>Get My Free Estimate</h2>
              <p>Name, phone, address, ZIP, concrete types, optional square footage, and photos if you have them.</p>
            </div>
            <QuoteForm
              variant="ad"
              submissionSource="meta_ad_landing_page"
              submitLabel="Get My Free Estimate"
              successMessage="Thanks. Your free estimate request was sent successfully."
            />
          </div>
        </section>

        <section className="ad-section ad-section--dark" id="results">
          <div className="ad-section__heading" data-reveal>
            <h2>Before and After Results</h2>
            <p>See the same sidewalk repair style featured in the ads.</p>
          </div>
          <BeforeAfterSlider />
          <div className="ad-result-grid">
            {adResultCards.map((card) => (
              <article className="ad-result-card" key={card.title} data-reveal>
                <h3>{card.title}</h3>
                <p>{card.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="ad-section">
          <div className="ad-section__heading" data-reveal>
            <h2>How It Works</h2>
          </div>
          <div className="ad-steps">
            {processSteps.map((step) => (
              <article className="ad-step" key={step.number} data-reveal>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </section>

        {showGoogleReviews ? (
          <section className="ad-section ad-reviews" id="reviews">
            <div className="ad-section__heading" data-reveal>
              <h2>Customer Reviews</h2>
              <p>Current feedback from the Rock Solid Leveling Google profile.</p>
            </div>
            <GoogleReviewsCarousel />
          </section>
        ) : null}

        <section className="ad-section ad-faq" id="faq">
          <div className="ad-section__heading" data-reveal>
            <h2>Frequently Asked Questions</h2>
          </div>
          <div className="faq-list">
            {faqs.map((faq) => (
              <div key={faq.question} data-reveal>
                <FaqItem question={faq.question} answer={faq.answer} />
              </div>
            ))}
          </div>
        </section>
      </main>

      <div className="ad-sticky-cta" aria-label="Free estimate actions">
        <a
          className="button button--primary"
          href="#free-estimate-form"
          onClick={() =>
            captureEvent("cta_clicked", {
              label: "Get My Free Estimate",
              location: "free_estimate_sticky",
              page_path: freeEstimatePath
            })
          }
        >
          Get Estimate
        </a>
        <a
          className="button button--secondary"
          href={contactDetails.phoneHref}
          onClick={() =>
            captureEvent("phone_number_clicked", {
              location: "free_estimate_sticky",
              page_path: freeEstimatePath
            })
          }
        >
          Call
        </a>
      </div>
    </div>
  );
}

function AreasServedTeaser() {
  const featuredAreas = [
    "Omaha",
    "Elkhorn",
    "Millard",
    "Bennington",
    "Ralston",
    "La Vista",
    "Papillion",
    "Gretna"
  ];

  return (
    <section className="section areas-teaser" id="areas-served">
      <div className="areas-teaser__copy" data-reveal>
        <p className="section-kicker">Areas served</p>
        <h2>Concrete Leveling Across Omaha and Nearby Communities</h2>
        <p>
          Rock Solid Leveling serves homeowners and businesses throughout the
          Omaha metro with grout-based concrete lifting for sidewalks, driveways,
          patios, steps, garage floors, and approaches.
        </p>
        <a
          className="button button--secondary"
          href={areasServedPath}
          onClick={() =>
            captureEvent("cta_clicked", {
              label: "View Areas Served",
              location: "homepage_areas_served"
            })
          }
        >
          View Areas Served
        </a>
      </div>

      <div className="areas-teaser__panel" data-reveal>
        <h3>Common service areas</h3>
        <ul className="area-chip-list" aria-label="Common service areas">
          {featuredAreas.map((area) => (
            <li key={area}>{area}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function AreasServedPage({ showGoogleReviews }: { showGoogleReviews: boolean }) {
  const visibleNavLinks = showGoogleReviews
    ? navLinks
    : navLinks.filter((link) => link.href !== "#reviews");
  const visibleFooterLinks = showGoogleReviews
    ? footerLinks
    : footerLinks.filter((link) => link.href !== "#reviews");
  const pageNavLinks = visibleNavLinks.map((link) => ({
    ...link,
    href: `/${link.href}`
  }));

  usePageMetadata({
    title: "Concrete Leveling Areas Served Near Omaha | Rock Solid Leveling",
    description:
      "Rock Solid Leveling provides concrete leveling in Omaha, Elkhorn, Millard, Papillion, Bellevue, Gretna, and nearby communities. Request a free estimate.",
    canonicalUrl: areasServedUrl,
    structuredData: areasServedStructuredData
  });

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <a href="/" className="site-header__brand" aria-label="Rock Solid Leveling home">
            <img src={headerLogo} alt="Rock Solid Leveling" />
          </a>

          <nav className="site-nav" aria-label="Primary">
            <ul>
              {pageNavLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <a
            className="site-header__cta button button--primary button--small"
            href="#estimate"
            onClick={() => captureEvent("cta_clicked", { label: "Get A Free Quote", location: "areas_header" })}
          >
            Get A Free Quote
          </a>
        </div>
      </header>

      <main>
        <section className="areas-hero section">
          <div className="areas-hero__copy" data-reveal>
            <p className="section-kicker">Omaha metro concrete leveling</p>
            <h1>Areas Served by Rock Solid Leveling</h1>
            <p>
              We lift and level settled concrete in Omaha and nearby communities
              using grout pumping that fills voids, supports the slab, and helps
              avoid the cost and mess of replacement.
            </p>
            <div className="hero__actions">
              <a
                className="button button--primary"
                href="#estimate"
                onClick={() =>
                  captureEvent("cta_clicked", {
                    label: "Request Service Area Estimate",
                    location: "areas_hero"
                  })
                }
              >
                Request a Free Estimate
              </a>
              <a
                className="button button--secondary"
                href={contactDetails.phoneHref}
                onClick={() => captureEvent("phone_number_clicked", { location: "areas_hero" })}
              >
                Call {contactDetails.phoneDisplay}
              </a>
            </div>
          </div>

          <div className="areas-hero__panel" data-reveal>
            <h2>Service area quick check</h2>
            <p>
              If your address is near the Omaha metro but not listed below, send
              it with your photos and we will confirm availability.
            </p>
            <a href="#estimate">Check my address</a>
          </div>
        </section>

        <section className="section areas-section">
          <div className="section-heading section-heading--center" data-reveal>
            <h2>Primary Service Area</h2>
            <p>
              These are the main Omaha-area communities featured for concrete
              leveling, lifting, and settled slab repair.
            </p>
          </div>

          <ul className="areas-grid" aria-label="Primary service areas">
            {primaryServiceAreas.map((area) => (
              <li key={area} data-reveal>
                <span>{area}</span>
                <small>Concrete leveling and slab repair</small>
              </li>
            ))}
          </ul>
        </section>

        <section className="section areas-section areas-section--split">
          <div className="areas-copy-block" data-reveal>
            <h2>Nearby Communities</h2>
            <p>
              We also review estimate requests from surrounding Nebraska and
              western Iowa communities when scheduling and project scope make
              sense.
            </p>
            <ul className="area-chip-list area-chip-list--quiet" aria-label="Nearby communities">
              {nearbyServiceAreas.map((area) => (
                <li key={area}>{area}</li>
              ))}
            </ul>
          </div>

          <div className="areas-copy-block areas-copy-block--dark" data-reveal>
            <h2>Services Available by Area</h2>
            <ul className="areas-service-list">
              {areaServiceTypes.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section estimate-section" id="estimate">
          <div className="quote-card" data-reveal>
            <div className="quote-card__header">
              <h2>Request a Service Area Estimate</h2>
              <p>Send your address, concrete type, and photos if you have them.</p>
            </div>
            <QuoteForm submissionSource="areas_served_page" />
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
              {visibleFooterLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href.startsWith("#") ? `/${link.href}` : link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="site-footer__column">
            <h3>Contact Us</h3>
            <ul>
              <li>{contactDetails.city}</li>
              <li>
                <a
                  href={contactDetails.phoneHref}
                  onClick={() => captureEvent("phone_number_clicked", { location: "areas_footer" })}
                >
                  {contactDetails.phoneDisplay}
                </a>
              </li>
              <li>
                <a
                  href={contactDetails.emailHref}
                  onClick={() => captureEvent("email_clicked", { location: "areas_footer" })}
                >
                  {contactDetails.email}
                </a>
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

function App() {
  const { showGoogleReviews } = useSiteConfig();
  const currentPath = getCurrentPath().replace(/\/$/, "") || "/";
  const isFreeEstimatePage = currentPath === freeEstimatePath;
  const isAreasServedPage = currentPath === areasServedPath;
  const visibleNavLinks = showGoogleReviews
    ? navLinks
    : navLinks.filter((link) => link.href !== "#reviews");
  const visibleFooterLinks = showGoogleReviews
    ? footerLinks
    : footerLinks.filter((link) => link.href !== "#reviews");

  useRevealAnimations(showGoogleReviews);

  useEffect(() => {
    initMetaPixel();
    trackMetaPixelViewContent(getMetaViewContentEventId());
    sendMetaViewContent();
  }, []);

  if (isFreeEstimatePage) {
    return <FreeEstimatePage showGoogleReviews={showGoogleReviews} />;
  }

  if (isAreasServedPage) {
    return <AreasServedPage showGoogleReviews={showGoogleReviews} />;
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <a href="#top" className="site-header__brand" aria-label="Rock Solid Leveling home">
            <img src={headerLogo} alt="Rock Solid Leveling" />
          </a>

          <nav className="site-nav" aria-label="Primary">
            <ul>
              {visibleNavLinks.map((link) => (
                <li key={link.href}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>

          <a
            className="site-header__cta button button--primary button--small"
            href="#estimate"
            onClick={() => captureEvent("cta_clicked", { label: "Get A Free Quote", location: "header" })}
          >
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
              Don&apos;t Replace it.
              <span>Level it.</span>
              <strong>With Rock Solid Results.</strong>
            </h1>
            <p className="hero__lede">
              We lift, level, and restore sunken concrete for a fraction of the
              cost of replacement using grout pumping. Grout is stronger, fills
              voids, and helps compact and settle soil.
            </p>
            <div className="hero__actions">
              <a
                className="button button--primary"
                href="#estimate"
                onClick={() => captureEvent("cta_clicked", { label: "Get Your Free Estimate", location: "hero" })}
              >
                Get Your Free Estimate
              </a>
              <a
                className="button button--secondary"
                href="#process"
                onClick={() => captureEvent("cta_clicked", { label: "See How It Works", location: "hero" })}
              >
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

        {showGoogleReviews ? (
          <section className="section reviews-section" id="reviews">
            <div className="section-heading section-heading--center" data-reveal>
              <h2>Customer Reviews</h2>
              <p>
                Read current Rock Solid Leveling feedback on Google.
              </p>
            </div>

            <GoogleReviewsCarousel />
          </section>
        ) : null}

        <section className="section section--faq" id="faq">
          <div className="section-heading section-heading--center" data-reveal>
            <h2>Frequently Asked Questions</h2>
            <p>
              Answers to commonly asked questions.
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

        <AreasServedTeaser />
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
              {visibleFooterLinks.map((link) => (
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
                <a
                  href={contactDetails.phoneHref}
                  onClick={() => captureEvent("phone_number_clicked", { location: "footer" })}
                >
                  {contactDetails.phoneDisplay}
                </a>
              </li>
              <li>
                <a
                  href={contactDetails.emailHref}
                  onClick={() => captureEvent("email_clicked", { location: "footer" })}
                >
                  {contactDetails.email}
                </a>
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
