export default function HomeNewsSectionSkeleton() {
  return (
    <section
      id="news"
      className="scroll-mt-24 bg-white py-14 md:py-20 animate-pulse"
      aria-hidden
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] lg:items-start lg:gap-12 xl:gap-16">
          <div>
            <div className="h-4 w-24 rounded bg-slate-200" />
            <div className="mt-8 h-11 w-36 rounded-full bg-slate-200" />
          </div>
          <ul className="divide-y divide-gray-200 border-y border-gray-200">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="px-2 py-5 sm:px-3">
                <div className="mb-2 flex gap-5">
                  <div className="h-3 w-28 rounded bg-slate-100" />
                  <div className="h-3 w-20 rounded bg-slate-100" />
                </div>
                <div className="h-4 rounded bg-slate-200" />
                <div className="mt-2 h-4 w-4/5 rounded bg-slate-100" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
