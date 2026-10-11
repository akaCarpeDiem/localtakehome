/** Partner cards and "Advertisement" placeholder boxes were removed for good (Oct 7, 2026).
 *  These no-op exports only keep old imports working. Real ads come from the AdSense script in <head>. */
export const PLACEMENTS_LIVE = false;
export const PARTNERS = {};
export function partnerCard() { return ""; }
export function partnerRow() { return ""; }
export function adSlot() { return ""; }
export function monetize() { return ""; }
export function pickPartnerKeys() { return []; }
export function renderPartners(host) {
  if (!host) return;
  host.innerHTML = "";
  host.hidden = true;
}
