import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  right?: React.ReactNode;
}

export function PageHeader({ title, subtitle, backTo, right }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white">
      <button
        type="button"
        onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
