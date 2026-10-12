/**
 * City and county pages. `local` is the id of the place's income tax in
 * src/data/local-2026.json, or null where the place has no income tax of its
 * own. `note` is only for facts that are certain; everything else on a city
 * page is computed from the rate files.
 */
export const CITIES = [
  // Places with their own income tax
  { slug: "new-york-city", name: "New York City", state: "NY", local: "nyc", note: "The city tax follows where you live, not where you work. Commuters from New Jersey, Long Island or Westchester do not pay it." },
  { slug: "yonkers", name: "Yonkers", state: "NY", local: "yonkers" },
  { slug: "philadelphia", name: "Philadelphia", state: "PA", local: "philadelphia", note: "Philadelphia's wage tax is charged on gross pay: neither a 401(k) nor pre-tax health premiums reduce it." },
  { slug: "pittsburgh", name: "Pittsburgh", state: "PA", local: "pittsburgh" },
  { slug: "detroit", name: "Detroit", state: "MI", local: "detroit" },
  { slug: "grand-rapids", name: "Grand Rapids", state: "MI", local: "grand-rapids-mi" },
  { slug: "lansing", name: "Lansing", state: "MI", local: "lansing-mi" },
  { slug: "flint", name: "Flint", state: "MI", local: "flint-mi" },
  { slug: "columbus-ohio", name: "Columbus", state: "OH", local: "columbus-oh" },
  { slug: "cleveland-ohio", name: "Cleveland", state: "OH", local: "cleveland-oh" },
  { slug: "cincinnati", name: "Cincinnati", state: "OH", local: "cincinnati-oh" },
  { slug: "toledo", name: "Toledo", state: "OH", local: "toledo-oh" },
  { slug: "akron", name: "Akron", state: "OH", local: "akron-oh" },
  { slug: "dayton", name: "Dayton", state: "OH", local: "dayton-oh" },
  { slug: "baltimore", name: "Baltimore", state: "MD", local: "baltimore-md" },
  { slug: "montgomery-county-md", name: "Montgomery County", state: "MD", local: "montgomery-md", county: true },
  { slug: "prince-georges-county-md", name: "Prince George's County", state: "MD", local: "prince-georges-md", county: true },
  { slug: "anne-arundel-county-md", name: "Anne Arundel County", state: "MD", local: "anne-arundel-md", county: true },
  { slug: "baltimore-county-md", name: "Baltimore County", state: "MD", local: "baltimore-county-md", county: true },
  { slug: "howard-county-md", name: "Howard County", state: "MD", local: "howard-md", county: true },
  { slug: "frederick-county-md", name: "Frederick County", state: "MD", local: "frederick-md", county: true },
  { slug: "indianapolis", name: "Indianapolis", state: "IN", local: "marion-in", note: "Indianapolis is in Marion County, and the county income tax is the local tax here." },
  { slug: "fort-wayne", name: "Fort Wayne", state: "IN", local: "allen-in", note: "Fort Wayne is in Allen County, and the county income tax is the local tax here." },
  { slug: "portland-oregon", name: "Portland", state: "OR", local: "portland-multnomah", note: "Oregon has no sales tax, but its income tax is among the highest in the country, and Portland adds two more income taxes on higher earners." },
  { slug: "kansas-city", name: "Kansas City", state: "MO", local: "kansas-city-mo" },
  { slug: "st-louis", name: "St. Louis", state: "MO", local: "st-louis-mo" },
  { slug: "louisville", name: "Louisville", state: "KY", local: "louisville-ky" },
  { slug: "lexington", name: "Lexington", state: "KY", local: "lexington-ky" },
  { slug: "wilmington-delaware", name: "Wilmington", state: "DE", local: "wilmington-de" },
  { slug: "denver", name: "Denver", state: "CO", local: "denver-co", lives: true, note: "Denver's only charge on employees is a flat occupational privilege tax of a few dollars a month for people who work in the city." },

  // Large cities with no income tax of their own
  { slug: "los-angeles", name: "Los Angeles", state: "CA", local: null },
  { slug: "san-diego", name: "San Diego", state: "CA", local: null },
  { slug: "san-jose", name: "San Jose", state: "CA", local: null },
  { slug: "san-francisco", name: "San Francisco", state: "CA", local: null, note: "San Francisco's payroll and gross receipts taxes are paid by employers. Nothing extra is taken from an employee's paycheck." },
  { slug: "sacramento", name: "Sacramento", state: "CA", local: null },
  { slug: "chicago", name: "Chicago", state: "IL", local: null },
  { slug: "houston", name: "Houston", state: "TX", local: null },
  { slug: "dallas", name: "Dallas", state: "TX", local: null },
  { slug: "san-antonio", name: "San Antonio", state: "TX", local: null },
  { slug: "austin", name: "Austin", state: "TX", local: null },
  { slug: "fort-worth", name: "Fort Worth", state: "TX", local: null },
  { slug: "phoenix", name: "Phoenix", state: "AZ", local: null },
  { slug: "tucson", name: "Tucson", state: "AZ", local: null },
  { slug: "jacksonville", name: "Jacksonville", state: "FL", local: null },
  { slug: "miami", name: "Miami", state: "FL", local: null },
  { slug: "tampa", name: "Tampa", state: "FL", local: null },
  { slug: "orlando", name: "Orlando", state: "FL", local: null },
  { slug: "charlotte", name: "Charlotte", state: "NC", local: null },
  { slug: "raleigh", name: "Raleigh", state: "NC", local: null },
  { slug: "seattle", name: "Seattle", state: "WA", local: null, note: "Seattle's payroll expense tax is paid by large employers, not by workers. Washington's paid leave and long-term care premiums do come out of pay." },
  { slug: "boston", name: "Boston", state: "MA", local: null },
  { slug: "nashville", name: "Nashville", state: "TN", local: null },
  { slug: "memphis", name: "Memphis", state: "TN", local: null },
  { slug: "las-vegas", name: "Las Vegas", state: "NV", local: null },
  { slug: "atlanta", name: "Atlanta", state: "GA", local: null },
  { slug: "minneapolis", name: "Minneapolis", state: "MN", local: null },
  { slug: "milwaukee", name: "Milwaukee", state: "WI", local: null },
  { slug: "oklahoma-city", name: "Oklahoma City", state: "OK", local: null },
  { slug: "albuquerque", name: "Albuquerque", state: "NM", local: null },
  { slug: "salt-lake-city", name: "Salt Lake City", state: "UT", local: null },
  { slug: "honolulu", name: "Honolulu", state: "HI", local: null },
  { slug: "new-orleans", name: "New Orleans", state: "LA", local: null },
  { slug: "virginia-beach", name: "Virginia Beach", state: "VA", local: null },
  { slug: "omaha", name: "Omaha", state: "NE", local: null },
];

export function cityPath(city) {
  return `/${city.slug}-paycheck-calculator/`;
}

export const CITY_BY_LOCAL = Object.fromEntries(CITIES.filter((city) => city.local).map((city) => [city.local, city]));

export function citiesInState(stateId) {
  return CITIES.filter((city) => city.state === stateId);
}
