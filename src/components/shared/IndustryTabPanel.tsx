import Image from 'next/image';

type IndustryBlockProps = {
  title: string;
  items: [string, string];
};

function IndustryBlock({ title, items }: IndustryBlockProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-borderPrimary/40">
      <h5 className="bg-bgSecondary px-5 py-3 text-base font-bold text-textPrimary">
        {title}
      </h5>
      <ul className="space-y-3 px-5 py-4">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span className="mt-0.5 font-bold text-textPrimary">•</span>
            <p className="text-sm leading-relaxed text-textSecondary md:text-base">
              {item}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type IndustryTabPanelProps = {
  title: string;
  imageSrc: string;
  imageAlt: string;
  problemTitle: string;
  problem1: string;
  problem2: string;
  solutionTitle: string;
  solution1: string;
  solution2: string;
  benefitTitle: string;
  benefit1: string;
  benefit2: string;
};

export default function IndustryTabPanel({
  title,
  imageSrc,
  imageAlt,
  problemTitle,
  problem1,
  problem2,
  solutionTitle,
  solution1,
  solution2,
  benefitTitle,
  benefit1,
  benefit2,
}: IndustryTabPanelProps) {
  return (
    <div>
      <h4 className="mb-8 text-center text-2xl font-bold text-textPrimary md:text-3xl">
        {title}
      </h4>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 45vw"
          />
        </div>

        <div className="space-y-5">
          <IndustryBlock title={problemTitle} items={[problem1, problem2]} />
          <IndustryBlock title={solutionTitle} items={[solution1, solution2]} />
          <IndustryBlock title={benefitTitle} items={[benefit1, benefit2]} />
        </div>
      </div>
    </div>
  );
}
