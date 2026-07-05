import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';

export function PropertyVirtualTour() {
  const [searchParams] = useSearchParams();
  const tourUrl = searchParams.get('tourUrl') || '';
  const title = searchParams.get('title') || 'Virtual Tour';

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full flex flex-col">
      <PageHeader title={title} subtitle="Virtual Tour" />
      <div className="flex-1 p-4">
        {tourUrl ? (
          <iframe
            src={tourUrl}
            title={title}
            className="w-full h-[70vh] rounded-xl border border-gray-200"
            allowFullScreen
          />
        ) : (
          <p className="text-center text-gray-500 py-12">Tour URL not available</p>
        )}
      </div>
    </div>
  );
}
