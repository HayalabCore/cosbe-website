/** CosBE's specialist partners, in display order (home and partners pages). */
export const PARTNERS = [
  {
    key: 'lbp',
    logo: '/partners/lbp.png',
    width: 105,
    height: 108,
    href: 'https://www.longblack.co.jp/',
  },
  {
    key: 'matTriangle',
    logo: '/partners/mat-triangle.png',
    width: 166,
    height: 111,
    href: 'https://mat-triangle.co.jp/',
  },
  {
    key: 'revitalize',
    logo: '/partners/revitalize.png',
    width: 225,
    height: 38,
    href: 'https://revitalizejapan.com/',
  },
] as const;

export type PartnerKey = (typeof PARTNERS)[number]['key'];
