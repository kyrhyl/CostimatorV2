'use client';

import { useState } from 'react';

export interface Signatory {
  id: string;
  name: string;
  role: string;
  status: 'signed' | 'pending' | 'can_sign';
  signedDate?: string;
  avatar?: string;
  initials?: string;
}

interface DigitalSignOffsProps {
  signatories: Signatory[];
  onApprove?: (signatoryId: string) => void;
  onReject?: (signatoryId: string) => void;
}

export default function DigitalSignOffs({ 
  signatories,
  onApprove,
  onReject 
}: DigitalSignOffsProps) {
  const [selectedSignatory, setSelectedSignatory] = useState<string | null>(null);

  const getStatusBadge = (status: Signatory['status']) => {
    switch (status) {
      case 'signed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-dpwh-green-100 text-dpwh-green-800 border border-dpwh-green-300">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            SIGNED
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            PENDING
          </span>
        );
      case 'can_sign':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-dpwh-blue-100 text-dpwh-blue-800 border border-dpwh-blue-300 animate-pulse">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
            </svg>
            ACTION REQUIRED
          </span>
        );
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-gray-900">Digital Sign-Offs & Approvals</h3>
        <p className="text-sm text-gray-600 mt-1">Required signatures for project authorization</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {signatories.map((signatory, index) => (
          <div
            key={signatory.id}
            className={`border rounded-lg p-4 transition-all ${
              signatory.status === 'can_sign'
                ? 'border-dpwh-blue-300 bg-dpwh-blue-50 shadow-md'
                : signatory.status === 'signed'
                ? 'border-dpwh-green-200 bg-green-50'
                : 'border-gray-200'
            }`}
          >
            {/* Avatar */}
            <div className="flex flex-col items-center mb-3">
              <div className={`w-16 h-16 rounded-full ${getAvatarColor(index)} flex items-center justify-center text-white text-xl font-bold mb-2`}>
                {signatory.initials || getInitials(signatory.name)}
              </div>
              {getStatusBadge(signatory.status)}
            </div>

            {/* Info */}
            <div className="text-center mb-3">
              <h4 className="text-sm font-semibold text-gray-900">{signatory.name}</h4>
              <p className="text-xs text-gray-600 mt-1">{signatory.role}</p>
              {signatory.signedDate && (
                <p className="text-xs text-gray-500 mt-2">
                  Signed: {new Date(signatory.signedDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            {signatory.status === 'can_sign' && (onApprove || onReject) && (
              <div className="space-y-2">
                {onApprove && (
                  <button
                    onClick={() => onApprove(signatory.id)}
                    className="w-full px-3 py-2 bg-dpwh-green-600 hover:bg-dpwh-green-700 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Approve Now</span>
                  </button>
                )}
                {onReject && (
                  <button
                    onClick={() => onReject(signatory.id)}
                    className="w-full px-3 py-2 bg-white hover:bg-red-50 text-red-600 text-sm font-medium rounded-md border border-red-300 transition-colors flex items-center justify-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span>Reject</span>
                  </button>
                )}
              </div>
            )}

            {/* Signed indicator */}
            {signatory.status === 'signed' && (
              <div className="flex items-center justify-center text-dpwh-green-600">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Approval Progress */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">Approval Progress</span>
          <span className="font-semibold text-gray-900">
            {signatories.filter(s => s.status === 'signed').length} of {signatories.length} Signed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-dpwh-green-600 h-2 rounded-full transition-all duration-500"
            style={{
              width: `${(signatories.filter(s => s.status === 'signed').length / signatories.length) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
}
