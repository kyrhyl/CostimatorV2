'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="text-center mb-4">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Report Error
          </h2>
          <p className="text-gray-600 mb-4">
            {error.message || 'Failed to load the report'}
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => reset()}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try again
          </button>
          <a
            href={`/estimate/${typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : ''}`}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 text-center"
          >
            Back to Estimate
          </a>
        </div>
      </div>
    </div>
  );
}
