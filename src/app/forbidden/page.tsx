import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-5">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 3c-.77-1.33-2.69-1.33-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Access Forbidden</h1>
        <p className="mt-3 text-slate-600">
          Your account is signed in but does not have permission to access this page.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/projects"
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Go to Projects
          </Link>
        </div>
      </div>
    </main>
  );
}
