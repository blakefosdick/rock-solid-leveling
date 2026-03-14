export type NavLink = {
  href: string;
  label: string;
};

export type Pillar = {
  label: string;
  copy: string;
};

export type Benefit = {
  title: string;
  copy: string;
};

export type Service = {
  title: string;
  copy: string;
};

export type ProcessStep = {
  number: string;
  title: string;
  copy: string;
};

export type ComparisonCard = {
  kicker: string;
  title: string;
  copy: string;
};

export type Faq = {
  question: string;
  answer: string;
};

export type LegalSection = {
  title: string;
  items: string[];
};

export const navLinks: NavLink[] = [
  { href: "#why-grout", label: "Why Grout" },
  { href: "#services", label: "Services" },
  { href: "#process", label: "How It Works" },
  { href: "#faq", label: "FAQ" },
  { href: "#quote", label: "Get a Quote" }
];

export const trustPillars: Pillar[] = [
  {
    label: "Best Material",
    copy: "Premium grout-based lifting instead of foam or old-school mud."
  },
  {
    label: "Better Pricing",
    copy: "Save thousands compared to replacing otherwise good concrete."
  },
  {
    label: "Quality Guaranteed",
    copy: "A local crew focused on honest work and a cleaner finish."
  }
];

export const benefits: Benefit[] = [
  {
    title: "Long-lasting grout",
    copy: "Unlike polyurethane foam, the natural grout mix does not shrink, degrade, or break down over time."
  },
  {
    title: "Less invasive",
    copy: "Small, strategically placed ports mean no demolition and no heavy equipment tearing up your yard."
  },
  {
    title: "Cost-effective",
    copy: "Lift and level existing slabs instead of paying for tear-out, haul-off, and new concrete."
  },
  {
    title: "More stable support",
    copy: "The process compacts loose soil under the slab for a stronger, more reliable base."
  },
  {
    title: "Cleaner finish",
    copy: "No overspray, no jagged patchwork, and your property is left looking better than we found it."
  }
];

export const services: Service[] = [
  {
    title: "Driveways",
    copy: "Lift settled concrete panels and smooth out trip hazards before they get worse."
  },
  {
    title: "Sidewalks and walkways",
    copy: "Bring front walks, side yards, and access paths back to level with a clean repair."
  },
  {
    title: "Garage floors",
    copy: "Correct settling slabs and restore a flatter, more dependable floor surface."
  },
  {
    title: "Patios, stoops, and landings",
    copy: "Level outdoor living areas without replacing the concrete you already have."
  }
];

export const comparisonCards: ComparisonCard[] = [
  {
    kicker: "Why settle for mud or foam?",
    title: "Built around grout-based leveling",
    copy: "Rock Solid Leveling uses a portland cement, sand, and bentonite grout blend designed for lasting support and a more permanent-feeling repair."
  },
  {
    kicker: "Same proven crew",
    title: "Formerly R&B Concrete Leveling and Repair",
    copy: "The name is new. The Omaha-area experience, honest recommendations, and same phone line are not."
  },
  {
    kicker: "Fast turnaround",
    title: "Ready for real life again quickly",
    copy: "Most jobs are completed in a few hours, with the concrete ready for use the next day."
  }
];

export const processSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Share the details",
    copy: "Send square footage, photos, and a quick description of the problem area so the team can size up the repair."
  },
  {
    number: "02",
    title: "Get a quote",
    copy: "You will get an estimate fast, and final pricing is confirmed around the actual site conditions and scope."
  },
  {
    number: "03",
    title: "Lift, level, and move on",
    copy: "Small ports are drilled, grout is injected beneath the slab, and the surface is gently raised back into place."
  }
];

export const faqs: Faq[] = [
  {
    question: "What is concrete leveling?",
    answer:
      "Small ports are drilled and a portland cement, sand, and bentonite grout is injected beneath the slab to fill voids and gently lift it back into place. It is faster, cleaner, and less disruptive than replacing the concrete."
  },
  {
    question: "How soon can I use my concrete after the repair?",
    answer:
      "Most jobs are completed in a few hours, and the concrete is typically ready to use the next day."
  },
  {
    question: "How much does it cost?",
    answer:
      "Pricing depends on the visible conditions, square footage, and how much correction the slab needs. In general, leveling costs far less than tearing out and replacing the concrete."
  },
  {
    question: "What is in the grout?",
    answer:
      "The mix is described on the old site as a premium grout made from portland cement, sand, and bentonite."
  },
  {
    question: "Do you still serve the same area after the rename?",
    answer:
      "Yes. Rock Solid Leveling is the new name for the same Omaha-area business formerly known as R&B Concrete Leveling and Repair."
  }
];

export const legalSections: LegalSection[] = [
  {
    title: "Terms and conditions",
    items: [
      "Residential concrete leveling and repair services are offered throughout Omaha and surrounding areas, subject to availability and site inspection.",
      "Quotes are estimates based on visible conditions. Final pricing may vary based on the actual project requirements discovered on site.",
      "Payment is due upon completion of services unless another arrangement is made in writing.",
      "At least 24 hours notice is requested for cancellations or rescheduling.",
      "The old site states a 4-year limited warranty for re-settlement related to serviced areas, excluding natural causes such as roots or erosion.",
      "Rock Solid Leveling is not responsible for pre-existing damage, improper maintenance, future ground movement, or incidental damages outside the service scope.",
      "Website content is owned by the business and cannot be copied, republished, or reused without permission."
    ]
  },
  {
    title: "Privacy policy",
    items: [
      "Contact and quote requests may collect name, email, phone number, address, and job site details.",
      "That information is used to provide estimates, perform services, send reminders, answer questions, and improve customer experience.",
      "The previous site stated that text-message consent may be used for notifications, reminders, and promotional offers, with STOP and HELP instructions available.",
      "The business states it does not sell or rent personal information and only shares data with trusted service partners when necessary.",
      "Reasonable physical, electronic, and managerial procedures are used to protect submitted data.",
      "Cookies may be used to improve site experience, and visitors can disable cookies through their browser settings.",
      "Visitors may request updates or deletion of their personal information by contacting the business."
    ]
  }
];

export const contactDetails = {
  city: "Omaha, NE",
  phoneDisplay: "402.682.8151",
  phoneHref: "tel:+14026828151",
  email: "info@rocksolidleveling.com",
  emailHref: "mailto:info@rocksolidleveling.com",
  domain: "rocksolidleveling.com"
};
