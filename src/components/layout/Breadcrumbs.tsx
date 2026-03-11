'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Breadcrumbs() {
  const pathname = usePathname();

  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = () => {
    if (!pathname || pathname === '/') {
      return [{ name: 'Home', path: '/' }];
    }

    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ name: 'Home', path: '/' }];

    paths.forEach((path, index) => {
      const href = '/' + paths.slice(0, index + 1).join('/');
      const name = path
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      breadcrumbs.push({ name, path: href });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3">
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path} className="flex items-center">
            {index > 0 && (
              <svg
                className="w-4 h-4 text-gray-400 mx-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {index === breadcrumbs.length - 1 ? (
              <span className="font-medium text-gray-900">{crumb.name}</span>
            ) : (
              <Link
                href={crumb.path}
                className="text-gray-600 hover:text-dpwh-blue-600 transition-colors"
              >
                {crumb.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
