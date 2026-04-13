'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type Ctx = {
  viewArticleHref: string | null;
  setViewArticleHref: (href: string | null) => void;
};

const AdminViewArticleContext = createContext<Ctx | null>(null);

export function AdminViewArticleProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [viewArticleHref, setViewArticleHrefState] = useState<string | null>(
    null
  );
  const setViewArticleHref = useCallback((href: string | null) => {
    setViewArticleHrefState(href);
  }, []);
  const value = useMemo(
    () => ({ viewArticleHref, setViewArticleHref }),
    [viewArticleHref, setViewArticleHref]
  );
  return (
    <AdminViewArticleContext.Provider value={value}>
      {children}
    </AdminViewArticleContext.Provider>
  );
}

export function useAdminViewArticleLink(): Ctx {
  const ctx = useContext(AdminViewArticleContext);
  if (!ctx) {
    throw new Error(
      'useAdminViewArticleLink must be used within AdminViewArticleProvider'
    );
  }
  return ctx;
}
