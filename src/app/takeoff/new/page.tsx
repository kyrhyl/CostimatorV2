'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NewTakeoffRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to new project page
    router.replace('/projects/new');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Redirecting to create new project...</p>
      </div>
    </div>
  );
}
