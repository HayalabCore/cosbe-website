interface ProcessStepProps {
  stepNumber: number;
  title: string;
  description: string;
  className?: string;
}

export default function ProcessStep({
  stepNumber,
  title,
  description,
  className = '',
}: ProcessStepProps) {
  const formattedNumber = String(stepNumber).padStart(2, '0');

  return (
    <div
      className={`relative bg-white rounded-xl shadow-lg p-6 border border-borderPrimary hover:shadow-xl transition-shadow ${className}`}
    >
      <div className="absolute -top-3 left-6 bg-primaryColor text-white px-4 py-1 rounded-full text-sm font-bold">
        STEP {formattedNumber}
      </div>
      <div className="pt-4">
        <h4 className="text-lg font-bold text-textPrimary mb-2">{title}</h4>
        <p className="text-textSecondary text-sm">{description}</p>
      </div>
    </div>
  );
}
