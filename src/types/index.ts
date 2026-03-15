export interface CaseStudy {
  id: number;
  slug: string;
  image: string;
  categoryKey: string;
  titleKey: string;
  dateKey: string;
  authorKey: string;
}

export interface Article {
  id: number;
  slug: string;
  image: string;
  categoryKey: string;
  titleKey: string;
  dateKey: string;
  authorKey: string;
  authorImage: string;
}

export interface Video {
  id: number;
  slug?: string;
  image: string;
  titleKey: string;
  dateKey: string;
  authorKey: string;
  authorImage: string;
}

export interface Notice {
  id: number;
  slug?: string;
  image: string;
  titleKey: string;
  dateKey: string;
  authorKey: string;
}

export interface Category {
  id: string;
  labelKey: string;
  href: string;
}

export interface NavItem {
  labelKey: string;
  href: string;
  children?: NavItem[];
}
