import { esc } from "./format.mjs";

/** Catalog of labeled partner placements. href is always a placeholder. */
export const PARTNERS = {
  taxSoftware: {
    title: "Tax software",
    benefit: "Turn this estimate into a filing plan when you’re ready.",
    button: "See partner",
  },
  savings: {
    title: "Savings account",
    benefit: "A place to park take-home pay once the paycheck lands.",
    button: "Learn more",
  },
  retirement: {
    title: "IRA guide",
    benefit: "You already defer — a partner IRA guide if you want a second account type.",
    button: "Learn more",
  },
  contractor: {
    title: "Quarterly tax & books",
    benefit: "Quarterly estimates and bookkeeping help for freelancers.",
    button: "See partner",
  },
  moving: {
    title: "Banking for a move",
    benefit: "Banking and account tools if a city change is on the table.",
    button: "Learn more",
  },
  banking: {
    title: "Everyday banking",
    benefit: "Account tools that sit beside a paycheck, not inside the tax math.",
    button: "See partner",
  },
  payroll: {
    title: "Payroll software",
    benefit: "Employer payroll software if you’re hiring or switching providers.",
    button: "See partner",
  },
};

export function partnerCard(def) {
  const card = typeof def === "string" ? PARTNERS[def] : def;
  if (!card) return "";
  return `<article class="partner-card">
    <p class="partner-eyebrow">Partner</p>
    <h3>${esc(card.title)}</h3>
    <p class="partner-benefit">${esc(card.benefit)}</p>
    <a class="ghost partner-cta" href="#partner">${esc(card.button || "Learn more")}</a>
  </article>`;
}

export function partnerRow(keysOrCards) {
  const cards = (keysOrCards || [])
    .map((item) => (typeof item === "string" ? PARTNERS[item] : item))
    .filter(Boolean)
    .slice(0, 2);
  if (!cards.length) return "";
  return `<section class="partner-row no-print" aria-label="Partner placements">${cards
    .map((card) => partnerCard(card))
    .join("")}</section>`;
}

export function adSlot() {
  return `<aside class="ad-slot no-print" data-ad-slot aria-label="Advertisement">
    <p class="partner-eyebrow">Advertisement</p>
    <div class="ad-slot-box"></div>
  </aside>`;
}

/** Static page monetization: up to two PartnerCards + one AdSlot. */
export function monetize(context = "default") {
  let keys;
  switch (context) {
    case "compare":
      keys = ["moving", "banking"];
      break;
    case "employer-cost":
      keys = ["payroll", "savings"];
      break;
    case "contractor":
      keys = ["contractor", "taxSoftware"];
      break;
    default:
      keys = ["taxSoftware", "savings"];
      break;
  }
  return `${partnerRow(keys)}${adSlot()}`;
}

/**
 * Context-aware partner keys for the live calculator.
 * Max two. Contractor and retirement beat generic when competing.
 */
export function pickPartnerKeys(input) {
  const preferred = [];
  if (input?.employment === "contractor") preferred.push("contractor");
  const trad = Number(input?.deductions?.traditional401k?.value) || 0;
  const roth = Number(input?.deductions?.roth401k?.value) || 0;
  if (trad > 0 || roth > 0) preferred.push("retirement");
  preferred.push("taxSoftware", "savings");
  const out = [];
  for (const key of preferred) {
    if (!out.includes(key)) out.push(key);
    if (out.length === 2) break;
  }
  return out;
}

/** Fill a [data-partners] host after paint. Empty while showing the sample stub. */
export function renderPartners(host, input, sample) {
  if (!host) return;
  if (sample) {
    host.innerHTML = "";
    host.hidden = true;
    return;
  }
  host.hidden = false;
  host.innerHTML = pickPartnerKeys(input)
    .map((key) => partnerCard(key))
    .join("");
}
