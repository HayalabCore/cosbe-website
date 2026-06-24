import { Category } from '@/types';

/** Category nav pills on case study listing pages. */
export const caseStudyCategories: Category[] = [
  { id: 'all', labelKey: 'categories.all', href: '/case-studies' },
  {
    id: 'efficiency',
    labelKey: 'categories.efficiency',
    href: '/case-studies/efficiency',
  },
  {
    id: 'hrImprovement',
    labelKey: 'categories.hrImprovement',
    href: '/case-studies/hr-improvement',
  },
  {
    id: 'innovation',
    labelKey: 'categories.innovation',
    href: '/case-studies/innovation',
  },
  {
    id: 'customerMarketing',
    labelKey: 'categories.customerMarketing',
    href: '/case-studies/customer-marketing',
  },
];

/** Maps URL slug → legacy category tag stored on imported articles. */
export const categorySlugToTag: Record<string, string> = {
  efficiency: '業務効率化',
  'hr-improvement': '人材・組織改善',
  innovation: '新規事業・イノベーション',
  'customer-marketing': '顧客対応・マーケティング支援',
};

export const validCategorySlugs = Object.keys(categorySlugToTag);
