import { Fragment, type ReactNode } from 'react';

export type ProcessFlowStep = {
  badge: string;
  title: string;
  description: string;
  icon: ReactNode;
};

function ProcessFlowArrow() {
  return (
    <div
      className="flex shrink-0 items-center justify-center self-center py-3 md:py-0 md:px-1 lg:px-2"
      aria-hidden
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primaryColor text-white shadow-md ring-4 ring-bgSecondary md:h-11 md:w-11">
        <svg
          className="h-5 w-5 rotate-90 md:rotate-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

function ProcessFlowCard({ step }: { step: ProcessFlowStep }) {
  return (
    <article className="relative min-w-0 flex-1">
      <div className="flex h-full flex-col rounded-2xl border border-borderPrimary/60 bg-white p-6 pt-10 shadow-lg md:p-8 md:pt-12">
        <span className="absolute -top-3 left-6 inline-block rounded bg-primaryColor px-4 py-1.5 text-sm font-semibold text-white">
          {step.badge}
        </span>
        <div className="mx-auto mb-5 mt-2 flex h-20 w-20 items-center justify-center rounded-full border-2 border-primaryColor/30 bg-primaryColor/10">
          {step.icon}
        </div>
        <h4 className="mb-3 text-center text-lg font-bold text-textPrimary">
          {step.title}
        </h4>
        <p className="text-center text-sm leading-relaxed text-textSecondary">
          {step.description}
        </p>
      </div>
    </article>
  );
}

/** Horizontal (desktop) or vertical (mobile) step cards with arrow connectors */
export default function ProcessFlow({ steps }: { steps: ProcessFlowStep[] }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-0">
      {steps.map((step, index) => (
        <Fragment key={step.badge}>
          <ProcessFlowCard step={step} />
          {index < steps.length - 1 ? <ProcessFlowArrow /> : null}
        </Fragment>
      ))}
    </div>
  );
}
