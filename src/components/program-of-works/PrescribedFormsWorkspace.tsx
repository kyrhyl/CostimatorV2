'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { usePrescribedFormsData } from './hooks/usePrescribedFormsData';
import { formatPowCurrency as formatCurrency, formatPowNumber as formatNumber } from './utils/formatters';
import { PowTab } from './tabs/PowTab';
import { AbcTab } from './tabs/AbcTab';
import { DupaTab } from './tabs/DupaTab';
import printStyles from './styles/pow-print.module.css';

const PowPrintBundle = dynamic(() => import('./print/PowPrintBundle').then((mod) => mod.PowPrintBundle));
const AbcPrintBundle = dynamic(() => import('./print/AbcPrintBundle').then((mod) => mod.AbcPrintBundle));
const DupaPrintBundle = dynamic(() => import('./print/DupaPrintBundle').then((mod) => mod.DupaPrintBundle));

interface PrescribedFormsWorkspaceProps {
  projectId: string;
}

type FormTab = 'pow' | 'abc' | 'dupa';

export default function PrescribedFormsWorkspace({ projectId }: PrescribedFormsWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<FormTab>('pow');
  const [printBundlesReady, setPrintBundlesReady] = useState(false);
  const [selectedDupaPrintKey, setSelectedDupaPrintKey] = useState<string | null>(null);

  const { data, loading, error, refetch } = usePrescribedFormsData(projectId);

  const preparePrintBundles = useCallback(() => {
    setPrintBundlesReady(true);
  }, []);

  const handlePrint = useCallback(() => {
    setPrintBundlesReady(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }, []);

  useEffect(() => {
    const beforePrint = () => setPrintBundlesReady(true);
    window.addEventListener('beforeprint', beforePrint);

    return () => {
      window.removeEventListener('beforeprint', beforePrint);
    };
  }, []);

  if (loading.any) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading prescribed forms...</p>
        </div>
      </div>
    );
  }

  if (error.any || !data.pow || !data.abc || !data.dupa) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-xl text-center bg-white border border-gray-200 rounded-lg p-8">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to load prescribed forms</h2>
          <p className="text-gray-600 mb-6">{error.any || 'Missing report data.'}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center justify-center px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700"
            >
              Retry
            </button>
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Project
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`${printStyles.noPrint} print:hidden bg-white border-b border-gray-200`} data-print-hide="true">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href={`/projects/${projectId}`} className="text-sm text-blue-600 hover:text-blue-800">
              ← Back to Project
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Prescribed Forms Packet</h1>
            <p className="text-sm text-gray-600">POW and ABC in landscape, DUPA in portrait</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onMouseEnter={preparePrintBundles}
              onFocus={preparePrintBundles}
              onClick={handlePrint}
              className="inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-700"
            >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
            </svg>
            Print / Save as PDF
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 pb-4 flex gap-2">
          {([
            { id: 'pow', label: 'POW' },
            { id: 'abc', label: 'ABC' },
            { id: 'dupa', label: 'DUPA' },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${printStyles.screenOnly} py-6`}>
        <div className="flex flex-col items-center">
          {activeTab === 'pow' && (
            <PowTab data={data.pow} formatCurrency={formatCurrency} formatNumber={formatNumber} />
          )}

          {activeTab === 'abc' && (
            <AbcTab data={data.abc} formatCurrency={formatCurrency} formatNumber={formatNumber} />
          )}

          {activeTab === 'dupa' && (
            <DupaTab
              data={data.dupa}
              formatCurrency={formatCurrency}
              formatNumber={formatNumber}
              selectedPrintKey={selectedDupaPrintKey}
              onSelectedPrintKeyChange={setSelectedDupaPrintKey}
              readOnly
            />
          )}
        </div>
      </div>

      {printBundlesReady && (
        <div className={printStyles.printOnly}>
          {activeTab === 'pow' && (
            <PowPrintBundle data={data.pow} formatCurrency={formatCurrency} formatNumber={formatNumber} />
          )}
          {activeTab === 'abc' && (
            <AbcPrintBundle data={data.abc} formatCurrency={formatCurrency} formatNumber={formatNumber} />
          )}
          {activeTab === 'dupa' && (
            <DupaPrintBundle
              data={data.dupa}
              selectedItemKey={selectedDupaPrintKey ?? undefined}
              formatCurrency={formatCurrency}
              formatNumber={formatNumber}
            />
          )}
        </div>
      )}
    </div>
  );
}
