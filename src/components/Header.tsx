'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signIn, signOut, useSession } from 'next-auth/react';

export default function Header() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');
  const { data: session } = useSession();
  const roles = session?.user?.roles || [];
  const isAdmin = roles.includes('master_admin') || roles.includes('admin');

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-2xl font-bold text-blue-600">C</span>
            </div>
            <div>
              <div className="text-xl font-bold">Costimator</div>
              <div className="text-xs text-blue-100">DPWH Estimation System</div>
            </div>
          </Link>

          <nav className="flex items-center space-x-1">
            <Link
              href="/"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${pathname === '/' ? 'bg-white text-blue-600 shadow-md' : 'text-white hover:bg-blue-500'}`}
            >
              Home
            </Link>

            {session?.user && (
            <Link
              href="/projects"
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/projects') ? 'bg-white text-blue-600 shadow-md' : 'text-white hover:bg-blue-500'}`}
            >
              Projects
            </Link>
            )}

            {session?.user && (
              <Link
                href="/dupa-templates"
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/dupa-templates') ? 'bg-white text-blue-600 shadow-md' : 'text-white hover:bg-blue-500'}`}
              >
                DUPA Templates
              </Link>
            )}

            {isAdmin && (
              <div className="relative group">
                <button suppressHydrationWarning className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/master') || isActive('/catalog') ? 'bg-white text-blue-600 shadow-md' : 'text-white hover:bg-blue-500'}`}>
                  Master Data 
                </button>
                <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <Link href="/master" className={`block px-4 py-3 text-sm hover:bg-blue-50 first:rounded-t-lg ${pathname === '/master' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}> Master Data Home</Link>
                  <div className="border-t border-gray-100"></div>
                  <Link href="/master/materials" className={`block px-4 py-3 text-sm hover:bg-blue-50 ${isActive('/master/materials') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}> CMPD (Materials & Prices)</Link>
                  <Link href="/master/equipment" className={`block px-4 py-3 text-sm hover:bg-blue-50 ${isActive('/master/equipment') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}> Equipment</Link>
                  <Link href="/master/labor" className={`block px-4 py-3 text-sm hover:bg-blue-50 ${isActive('/master/labor') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}> Labor Rates</Link>
                  <div className="border-t border-gray-100"></div>
                  <Link href="/catalog" className={`block px-4 py-3 text-sm hover:bg-blue-50 last:rounded-b-lg ${isActive('/catalog') ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}> DPWH Pay Items</Link>
                </div>
              </div>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {session?.user ? (
              <>
                {isAdmin && (
                  <Link
                    href="/admin/users"
                    className="px-3 py-2 rounded-lg text-sm font-medium text-white hover:bg-blue-500"
                  >
                    Admin
                  </Link>
                )}
                <span className="text-sm text-blue-100">{session.user.name || session.user.email}</span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-white hover:bg-blue-500"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn()}
                className="px-3 py-2 rounded-lg text-sm font-medium text-white hover:bg-blue-500"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
