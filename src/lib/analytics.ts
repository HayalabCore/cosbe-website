export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export const CONSENT_STORAGE_KEY = 'cosbe-analytics-consent';
export const CONSENT_OPEN_EVENT = 'cosbe:open-cookie-settings';

export type ConsentChoice = 'granted' | 'denied';

// Regions where analytics storage stays denied until the visitor opts in
// (EEA, UK, Switzerland). Elsewhere (Japan, US, Asia) it is granted by default
// and the visitor can opt out. Google resolves the region server-side.
export const OPT_IN_REGIONS = [
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  'IS',
  'LI',
  'NO',
  'GB',
  'CH',
];
