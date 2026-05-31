type HomeSectionTitleProps = {
  section: string;
  className?: string;
};

export default function HomeSectionTitle({
  section,
  className = '',
}: HomeSectionTitleProps) {
  return (
    <div className={`text-left ${className}`}>
      <h2 className="inline-block border-b-4 border-primaryColor pb-2 text-2xl font-bold text-textHeading md:text-3xl">
        {section}
      </h2>
    </div>
  );
}
