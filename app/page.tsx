'use client';

import { useState } from 'react';

interface ScenarioItem {
  angle: string;
  description: string;
  queries: string[];
}

const PALETTE = [
  '#6366f1',
  '#f97316',
  '#ef4444',
  '#22c55e',
  '#3b82f6',
  '#eab308',
  '#14b8a6',
  '#ec4899',
  '#a855f7',
  '#f59e0b',
];

function getColor(index: number) {
  return PALETTE[index % PALETTE.length];
}

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function UserIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" className="w-5 h-5">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
      />
    </svg>
  );
}

function SheetIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

async function parseApiResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();
  if (contentType.includes('application/json')) {
    return JSON.parse(rawText) as { scenarios?: ScenarioItem[]; error?: string };
  }
  const cleanText = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  throw new Error(cleanText || 'Server returned a non-JSON response');
}

export default function GeoQueryGenerator() {
  const [industry, setIndustry] = useState('');
  const [service, setService] = useState('');
  const [numberOfQueries, setNumberOfQueries] = useState('10');
  const [language, setLanguage] = useState('Thai');
  const [customScenarios, setCustomScenarios] = useState('');
  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalQueries = scenarios.reduce((sum, s) => sum + s.queries.length, 0);

  const handleGenerate = async () => {
    if (loading) return;
    if (!industry || !service) {
      setError('Please fill in Industry and Service fields');
      return;
    }
    setLoading(true);
    setError('');
    setScenarios([]);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry,
          service,
          numberOfQueries: parseInt(numberOfQueries, 10),
          language,
          customScenarios,
        }),
      });
      const data = await parseApiResponse(response);
      if (!response.ok) throw new Error(data?.error || 'Failed to generate queries');
      setScenarios(data.scenarios || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate queries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError('Unable to copy to clipboard');
    }
  };

  const exportToCSV = () => {
    const rows: string[][] = [['Scenario', 'Description', 'Query']];
    scenarios.forEach((s) => {
      s.queries.forEach((q) => rows.push([s.angle, s.description, q]));
    });
    const csvContent = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'geo-queries.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">GEO Query Generator</h1>

        {/* Input Form */}
        <div className="bg-gray-900 rounded-lg p-6 mb-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Industry</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Healthcare, Real Estate"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Service</label>
              <input
                type="text"
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Emergency Dental, Property Management"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Queries per Scenario</label>
              <input
                type="number"
                value={numberOfQueries}
                onChange={(e) => setNumberOfQueries(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>Thai</option>
                <option>English</option>
                <option>Japanese</option>
                <option>Chinese</option>
                <option>Korean</option>
                <option>Spanish</option>
                <option>French</option>
                <option>German</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Custom Scenarios (Optional)</label>
            <textarea
              value={customScenarios}
              onChange={(e) => setCustomScenarios(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
              placeholder="Add any specific scenarios or context you want included..."
            />
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors text-base"
          >
            {loading ? 'Generating...' : 'Generate Queries'}
          </button>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-7 bg-blue-500 rounded-full" />
              <div className="h-6 w-64 bg-gray-800 rounded animate-pulse" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-gray-900 rounded-lg p-4 animate-pulse h-28 border border-gray-800" />
              ))}
            </div>
          </div>
        )}

        {/* Key User Scenarios Identified */}
        {scenarios.length > 0 && (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-7 bg-blue-500 rounded-full" />
                <h2 className="text-xl font-bold">Key User Scenarios Identified</h2>
                <span className="text-sm text-gray-400 ml-auto">
                  {scenarios.length} scenarios · {totalQueries} queries
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {scenarios.map((scenario, index) => {
                  const color = getColor(index);
                  return (
                    <div
                      key={index}
                      style={{
                        borderLeftColor: color,
                        borderLeftWidth: '4px',
                        borderLeftStyle: 'solid',
                      }}
                      className="bg-gray-900 rounded-lg p-4 border border-gray-800"
                    >
                      <div
                        style={{ backgroundColor: hexToRgba(color, 0.2) }}
                        className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                      >
                        <UserIcon color={color} />
                      </div>
                      <p className="font-bold text-sm text-white leading-tight">{scenario.angle}</p>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">
                        {scenario.description}
                      </p>
                      <p
                        style={{ color }}
                        className="text-xs font-medium mt-2"
                      >
                        {scenario.queries.length} queries
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Engineered Queries Table */}
            <div>
              <div className="flex justify-between items-start mb-5">
                <div>
                  <h2 className="text-2xl font-bold">Engineered Queries</h2>
                  <p className="text-sm text-gray-400 mt-1">Mapped high-intent user scenarios</p>
                </div>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium border border-gray-700 transition-colors"
                >
                  <SheetIcon />
                  Export for Sheets
                </button>
              </div>

              <div className="bg-gray-900 rounded-lg overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800 border-b border-gray-700">
                      <tr>
                        <th className="w-12 px-4 py-4 text-left">
                          <input type="checkbox" className="rounded border-gray-600 bg-gray-700 w-4 h-4 cursor-pointer" />
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 w-72">
                          User Scenario
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                          Conversational Query
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 w-28">
                          Copy
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {scenarios.map((scenario, scenarioIndex) => {
                        const color = getColor(scenarioIndex);
                        return scenario.queries.map((query, queryIndex) => (
                          <tr
                            key={`${scenarioIndex}-${queryIndex}`}
                            className="hover:bg-gray-800/50 transition-colors"
                          >
                            <td className="px-4 py-4">
                              <input type="checkbox" className="rounded border-gray-600 bg-gray-700 w-4 h-4 cursor-pointer" />
                            </td>
                            <td className="px-6 py-4 align-top">
                              {queryIndex === 0 && (
                                <div>
                                  <div
                                    style={{
                                      borderColor: color,
                                      backgroundColor: hexToRgba(color, 0.12),
                                      color,
                                    }}
                                    className="inline-block px-3 py-1.5 rounded-md text-xs font-semibold border mb-2 leading-tight max-w-xs"
                                  >
                                    {scenario.angle}
                                  </div>
                                  <button
                                    onClick={() => copyToClipboard(scenario.queries.join('\n'))}
                                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                                  >
                                    <CopyIcon />
                                    Copy scenario ({scenario.queries.length})
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-100">{query}</td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => copyToClipboard(query)}
                                className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-md border border-gray-700 hover:border-gray-500 transition-colors"
                              >
                                <CopyIcon />
                                Row
                              </button>
                            </td>
                          </tr>
                        ));
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
