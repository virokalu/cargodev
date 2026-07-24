// Country list for the vehicle Destination field, sourced from the
// `world-countries` npm package instead of a hand-maintained array — gives us
// a flag emoji per country for free alongside the name.
//
// Imported only from Server Components (app/(dashboard)/vehicles/add/page.tsx)
// and reduced to {name, flag} before being passed down as a prop — the full
// world-countries dataset (currencies, tld, native names, idd, ...) never
// needs to reach the client bundle, just this small derived list.

import worldCountries from "world-countries";

export interface CountryOption {
  name: string;
  flag: string;
}

export const COUNTRIES: CountryOption[] = worldCountries
  .map((country) => ({ name: country.name.common, flag: country.flag }))
  .sort((a, b) => a.name.localeCompare(b.name));
