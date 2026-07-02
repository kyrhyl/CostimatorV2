'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export const dynamic = 'force-dynamic';

export default function Home() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { data: session } = useSession();
  const isAuthenticated = Boolean(session?.user);

  const heroImages = [
    {
      url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1600&auto=format&fit=crop&q=80',
      alt: 'Construction site overview'
    },
    {
      url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1600&auto=format&fit=crop&q=80',
      alt: 'Modern building construction'
    },
    {
      url: 'https://images.unsplash.com/photo-1581094271901-8022df4466f9?w=1600&auto=format&fit=crop&q=80',
      alt: 'Road construction project'
    },
    {
      url: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=1600&auto=format&fit=crop&q=80',
      alt: 'Heavy construction machinery'
    },
    {
      url: 'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=1600&auto=format&fit=crop&q=80',
      alt: 'Construction workers on site'
    }
  ];

  // Auto-rotate images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [heroImages.length]);

  const modules = [
    {
      title: 'Projects',
      description: 'Complete project management for program of works, BOQ, and cost estimation',
      href: '/projects',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      stats: ['BOQ', 'Estimates', 'POW', 'Tracking'],
      gradient: 'from-blue-500 to-blue-600',
      requiresAuth: true,
    },
    {
      title: 'DUPA Templates',
      description: 'Reusable detailed unit price analysis with material, labor, and equipment',
      href: '/dupa-templates',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      stats: ['Templates', 'Location Rates', 'Multi-Input', 'Instant BOQ'],
      gradient: 'from-emerald-500 to-emerald-600',
      requiresAuth: true,
    },
    {
      title: 'Program of Works',
      description: 'Project-based BOQ entry, estimates, DUPA reports, and prescribed forms',
      href: '/projects',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      stats: ['BOQ Entry', 'Detailed DUPA', 'Prescribed Forms', 'Project Flow'],
      gradient: 'from-violet-500 to-violet-600',
      requiresAuth: true,
    },
    {
      title: 'Master Data',
      description: 'Centralized management of materials, equipment, labor rates, and pricing',
      href: '/master',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      ),
      stats: ['Materials', 'Equipment', 'Labor', 'Import/Export'],
      gradient: 'from-slate-500 to-slate-600',
      requiresAuth: true,
    },
  ];

  const visibleModules = modules.filter(module =>
    module.requiresAuth ? isAuthenticated : true
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="relative bg-white border-b border-slate-200 overflow-hidden">
        {/* Background Images with Crossfade */}
        <div className="absolute inset-0">
          {heroImages.map((image, index) => (
             <div
               key={index}
               className={`absolute inset-0 transition-opacity duration-1000 ${
                 index === currentImageIndex ? 'opacity-100' : 'opacity-0'
               }`}
             >
                <Image
                  src={image.url}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                  fill
                  unoptimized
                  sizes="100vw"
                />
             </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/50 via-slate-900/40 to-transparent"></div>
        </div>

        {/* Navigation Dots */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentImageIndex
                  ? 'bg-white w-8'
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-white/20">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="bg-slate-900/60 backdrop-blur-sm px-4 py-2 rounded-lg">
                <h1 className="text-4xl font-bold text-white drop-shadow-lg">Costimator</h1>
                <p className="text-blue-300 text-sm font-medium mt-0.5">DPWH Cost Estimation Platform</p>
              </div>
            </div>
            
            <div className="bg-slate-900/60 backdrop-blur-md px-6 py-6 rounded-xl shadow-2xl">
              <h2 className="text-3xl font-semibold text-white mb-4 drop-shadow-md">
                Professional Construction Cost Management System
              </h2>
              <p className="text-lg text-slate-100 leading-relaxed mb-8">
                 Integrated platform for detailed unit price analysis (DUPA), bill of quantities,
                 and program of works generation compliant with DPWH Volume III standards. Streamline your construction project estimation 
                 workflow with automated calculations and comprehensive data management.
              </p>

              {!isAuthenticated && (
                <div className="flex gap-4">
                  <Link
                    href="/auth/signin"
                    className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-white transition-all shadow-lg hover:scale-105"
                  >
                    Sign in to access projects
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">100%</div>
              <div className="text-slate-300 text-sm">DPWH Compliance</div>
            </div>
            <div className="text-center border-l border-slate-700 pl-8">
              <div className="text-3xl font-bold mb-1">5</div>
              <div className="text-slate-300 text-sm">Core Modules</div>
            </div>
            <div className="text-center border-l border-slate-700 pl-8">
              <div className="text-3xl font-bold mb-1">Automated</div>
              <div className="text-slate-300 text-sm">Calculations</div>
            </div>
            <div className="text-center border-l border-slate-700 pl-8">
              <div className="text-3xl font-bold mb-1">Multi-Format</div>
              <div className="text-slate-300 text-sm">Export Options</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Enterprise Features</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">DPWH Standards Compliance</h3>
                    <p className="text-slate-600 text-sm">100% aligned with official Volume III specifications and calculation methods</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Real-Time Calculations</h3>
                    <p className="text-slate-600 text-sm">Automated quantity calculations and cost updates as you model</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Centralized Data Management</h3>
                    <p className="text-slate-600 text-sm">Single source of truth for materials, equipment, and labor rates</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">System Capabilities</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-slate-900 mb-1">Unlimited</div>
                  <div className="text-sm text-slate-600">Projects & Estimates</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-slate-900 mb-1">Multi-Location</div>
                  <div className="text-sm text-slate-600">Regional Rates</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-slate-900 mb-1">PDF & Excel</div>
                  <div className="text-sm text-slate-600">Export Formats</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-slate-900 mb-1">Historical</div>
                  <div className="text-sm text-slate-600">Version Tracking</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Streamline your construction cost estimation workflow with professional tools designed for Philippine infrastructure projects
          </p>
          <div className="flex gap-4 justify-center">
            {isAuthenticated ? (
              <>
                <Link href="/projects" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg">
                  Browse Projects
                </Link>
              </>
            ) : (
              <Link href="/auth/signin" className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg">
                Sign in to continue
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
