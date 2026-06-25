export default function HomeCaseStudiesSectionSkeleton() {
  return (
    <section
      id="case-studies"
      className="scroll-mt-24 bg-bgAccent py-14 md:py-20 animate-pulse"
      aria-hidden
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="mt-8 h-6 w-64 rounded bg-slate-200" />
        <div className="mt-4 h-16 max-w-3xl rounded bg-slate-100" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-lg border border-primaryColor/15 bg-white shadow-md"
            >
              <div className="aspect-[4/3] bg-slate-200" />
              <div className="space-y-3 p-4">
                <div className="h-4 rounded bg-slate-200" />
                <div className="h-4 w-4/5 rounded bg-slate-100" />
                <div className="h-3 w-24 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <div className="h-11 w-40 rounded-full bg-slate-200" />
        </div>
      </div>
    </section>
  );
}
