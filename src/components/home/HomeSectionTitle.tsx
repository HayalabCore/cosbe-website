type HomeSectionTitleProps = {
  sectionJa: string;
  sectionEn: string;
  className?: string;
};

export default function HomeSectionTitle({
  sectionJa,
  sectionEn,
  className = '',
}: HomeSectionTitleProps) {
  return (
    <div className={`text-center ${className}`}>
      <h2 className="inline-block border-b-4 border-primaryColor pb-2 text-2xl font-bold text-textHeading md:text-3xl">
        <span>{sectionJa}</span>
        <span className="ml-2 text-base font-semibold text-textTertiary md:text-lg">
          {sectionEn}
        </span>
      </h2>
    </div>
  );
}
