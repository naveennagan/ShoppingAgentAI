'use client';

const STEP_NAMES = [
  'Postcode',
  'Address',
  'Choose Plan',
  'Add-ons',
  'TV Package',
  'SIM Plan',
  'Home Phone',
  'Summary',
];

interface StepProgressBarProps {
  currentStep: number;
}

export default function StepProgressBar({ currentStep }: StepProgressBarProps) {
  const totalSteps = STEP_NAMES.length;
  const stepNumber = currentStep + 1;
  const stepName = STEP_NAMES[currentStep] ?? '';

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>
          Step {stepNumber} of {totalSteps}: {stepName}
        </span>
      </div>
      <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${(stepNumber / totalSteps) * 100}%`,
            background: 'var(--primary)',
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}
