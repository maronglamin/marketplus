import React from 'react';

interface FormStepIndicatorProps {
  steps: string[];
  currentStep: number;
  accent?: string;
}

export function FormStepIndicator({ steps, currentStep, accent = 'bg-sky-500' }: FormStepIndicatorProps) {
  return (
    <div className="px-4 py-3 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">
          Step {currentStep} of {steps.length}
        </span>
        <span className="text-xs font-medium text-gray-700">{steps[currentStep - 1]}</span>
      </div>
      <div className="flex gap-1">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i < currentStep ? accent : 'bg-gray-200'}`}
          />
        ))}
      </div>
    </div>
  );
}
