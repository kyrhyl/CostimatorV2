'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface MenuItem {
  name: string;
  path: string;
  icon: string;
  submenu?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: '📊',
  },
  {
    name: 'My Projects',
    path: '/projects',
    icon: '📁',
  },
  {
    name: 'DUPA Templates',
    path: '/dupa-templates',
    icon: '📄',
  },
  {
    name: 'Master Data',
    path: '/master',
    icon: '⚙️',
    submenu: [
      { name: 'Materials & Prices', path: '/master/materials', icon: '🧱' },
      { name: 'Equipment', path: '/master/equipment', icon: '🚜' },
      { name: 'Labor Rates', path: '/master/labor', icon: '👷' },
      { name: 'Pay Items', path: '/catalog', icon: '📑' },
    ],
  },
  {
    name: 'Reports',
    path: '/reports',
    icon: '📊',
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname?.startsWith(path + '/');
  };

  const toggleSubmenu = (menuName: string) => {
    setExpandedMenu(expandedMenu === menuName ? null : menuName);
  };

  const MenuItem = ({ item, isSubmenuItem = false }: { item: MenuItem; isSubmenuItem?: boolean }) => {
    const active = isActive(item.path);
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedMenu === item.name;

    if (hasSubmenu) {
      return (
        <div>
          <button
            onClick={() => toggleSubmenu(item.name)}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-all rounded-lg ${
              active
                ? 'bg-dpwh-blue-600 text-white shadow-md'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-lg">{item.icon}</span>
              <span>{item.name}</span>
            </div>
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1">
              {item.submenu?.map((subitem) => (
                <MenuItem key={subitem.path} item={subitem} isSubmenuItem />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        href={item.path}
        className={`flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-all rounded-lg ${
          isSubmenuItem ? 'pl-8' : ''
        } ${
          active
            ? 'bg-dpwh-blue-600 text-white shadow-md'
            : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span className="text-lg">{item.icon}</span>
        <span>{item.name}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 
          flex flex-col transition-transform duration-300 z-40
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo section */}
        <div className="flex items-center space-x-3 px-6 py-4 border-b border-gray-200">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
            <span className="text-xl font-bold text-white">C</span>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-800">Costimator</div>
            <div className="text-xs text-gray-500">DPWH Portal</div>
          </div>
        </div>

        {/* Navigation menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {menuItems.map((item) => (
            <MenuItem key={item.path} item={item} />
          ))}
        </nav>

        {/* User profile section */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-3 px-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-white">U</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700">User</div>
              <div className="text-xs text-gray-500">Administrator</div>
            </div>
          </div>

          {/* Settings & Dark mode toggle */}
          <div className="mt-3 flex items-center justify-around px-2">
            <button
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Toggle dark mode"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            </button>
            <button
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
