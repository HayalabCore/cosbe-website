import { CaseStudy, Category } from '@/types';

export const caseStudies: CaseStudy[] = [
  {
    id: 1,
    slug: '2month-ai-mvp',
    image: '/case-studies/new-business-2months.png',
    categoryKey: 'case1.category',
    titleKey: 'case1.title',
    dateKey: 'case1.date',
    authorKey: 'case1.author',
  },
  {
    id: 2,
    slug: 'kando',
    image: '/case-studies/training-instructor.png',
    categoryKey: 'case2.category',
    titleKey: 'case2.title',
    dateKey: 'case2.date',
    authorKey: 'case2.author',
  },
  {
    id: 3,
    slug: 'cosbe',
    image: '/case-studies/resume-screening.png',
    categoryKey: 'case3.category',
    titleKey: 'case3.title',
    dateKey: 'case3.date',
    authorKey: 'case3.author',
  },
];

export const caseStudyCategories: Category[] = [
  { id: 'all', labelKey: 'categories.all', href: '/case-studies' },
  { id: 'efficiency', labelKey: 'categories.efficiency', href: '/case-studies/efficiency' },
  { id: 'hrImprovement', labelKey: 'categories.hrImprovement', href: '/case-studies/hr-improvement' },
  { id: 'innovation', labelKey: 'categories.innovation', href: '/case-studies/innovation' },
  { id: 'customerMarketing', labelKey: 'categories.customerMarketing', href: '/case-studies/customer-marketing' },
];

export const categoryToCaseStudies: Record<string, number[]> = {
  'efficiency': [],
  'hr-improvement': [2, 3],
  'innovation': [1],
  'customer-marketing': [],
};

export const validCategorySlugs = ['efficiency', 'hr-improvement', 'innovation', 'customer-marketing'];
