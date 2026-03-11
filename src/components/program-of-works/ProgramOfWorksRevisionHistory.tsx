'use client';

interface RevisionEntry {
  timestamp: string;
  description: string;
  author: string;
}

interface ProgramOfWorksRevisionHistoryProps {
  entries?: RevisionEntry[];
}

export default function ProgramOfWorksRevisionHistory({
  entries = []
}: ProgramOfWorksRevisionHistoryProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Revision History</h3>
          <p className="text-xs text-gray-500">Submitted-only changes</p>
        </div>
        <button className="text-xs text-blue-600 hover:text-blue-800">View all</button>
      </div>

      {entries.length === 0 ? (
        <div className="text-sm text-gray-500">No revisions recorded yet.</div>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={`${entry.timestamp}-${entry.author}-${entry.description}`} className="border-l-2 border-blue-200 pl-4">
              <p className="text-xs text-gray-400">{entry.timestamp}</p>
              <p className="text-sm text-gray-900 mt-1">{entry.description}</p>
              <p className="text-xs text-gray-500 mt-1">By {entry.author}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
