'use client';

import { useState } from 'react';

interface Query {
  query: string;
  scenario: string;
}

async function parseApiResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  if (contentType.includes('application/json')) {
    return JSON.parse(rawText) as { queries?: Query[]; error?: string };
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
  const [queries, setQueries] = useState<Query[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (loading) return;

    if (!industry || !service) {
      setError('Please fill in Industry and Service fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          industry,
          service,
          numberOfQueries: parseInt(numberOfQueries, 10),
          language,
          customScenarios,
        }),
      });

      const data = await parseApiResponse(response);

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to generate queries');
      }

      setQueries(data.queries || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate queries. Please try again.';
      setError(message);
      setQueries([]);
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
    const csvContent = [
      ['Query', 'Scenario'],
      ...queries.map((q) => [q.query, q.scenario]),
    ]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
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

        <div className="bg-gray-900 rounded-lg p-6 mb-8 shadow-xl">
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
              <label className="block text-sm font-medium mb-2">Number of Queries</label>
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
            <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            {loading ? 'Generating...' : 'Generate Queries'}
          </button>
        </div>

        {queries.length > 0 && (
          <>
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Scenario Cards</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {queries.map((q, index) => (
                  <div key={index} className="bg-gray-900 rounded-lg p-5 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-blue-400 font-semibold text-sm">Query #{index + 1}</span>
                      <button
                        onClick={() => copyToClipboard(q.query)}
                        className="text-gray-400 hover:text-gray-200 text-xs px-2 py-1 bg-gray-800 rounded"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="font-medium mb-3 text-gray-100">{q.query}</p>
                    <p className="text-sm text-gray-400">{q.scenario}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Query Table</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(queries.map((q) => q.query).join('\n'))}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Copy All Queries
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
              <div className="bg-gray-900 rounded-lg overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold w-12">#</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Query</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Scenario</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {queries.map((q, index) => (
                        <tr key={index} className="hover:bg-gray-800/50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                          <td className="px-6 py-4 text-sm font-medium">{q.query}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{q.scenario}</td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => copyToClipboard(q.query)}
                              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                            >
                              Copy
                            </button>
                          </td>
                        </tr>
                      ))}
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
