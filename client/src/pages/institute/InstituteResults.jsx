import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import Sidebar from '../../components/Sidebar';
import Layout from '../../components/Layout';
import API from '../../api/axios';

const SUSPICIOUS_BADGE = {
  none: { label: '✅ Manually Submitted', style: 'bg-green-100 text-green-700 border border-green-200' },
  low:  { label: '🕐 Time Up', style: 'bg-blue-100 text-blue-700 border border-blue-200' },
  moderate: { label: '⚠️ Moderate Suspicious', style: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
  high: { label: '🚨 Highly Suspicious', style: 'bg-red-100 text-red-700 border border-red-200' },
};

const REASON_LABELS = {
  manual: '✅ Manual Submit',
  time_up: '⏱️ Time Up',
  tab_switch: '🔄 Tab Switch',
  fullscreen_exit: '🖥️ Fullscreen Exit',
  extension_detected: '🧩 Extension Detected',
  devtools_detected: '🛠️ DevTools Detected',
  multiple_warnings: '⚠️ Multiple Warnings',
  camera_denied: '📷 Camera Denied',
  auto_other: '🤖 Auto Submit',
};

const InstituteResults = () => {
  const [results, setResults] = useState([]);
  const [exams, setExams] = useState([]);
  const [search, setSearch] = useState('');
  const [examFilter, setExamFilter] = useState('');
  const [suspiciousFilter, setSuspiciousFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [r, e] = await Promise.all([
        API.get('/results'),
        API.get('/exams'),
      ]);
      setResults(r.data);
      setExams(e.data);
    } finally {
      setLoading(false);
    }
  };

  const filtered = results.filter(r => {
    const name = r.studentId?.name || '';
    const email = r.studentId?.email || '';
    const matchSearch = !search ||
      name.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase());
    const matchExam = !examFilter || r.examId?._id === examFilter || r.examId === examFilter;
    const matchSuspicious = !suspiciousFilter || r.suspiciousLevel === suspiciousFilter;
    return matchSearch && matchExam && matchSuspicious;
  });

  const highCount = results.filter(r => r.suspiciousLevel === 'high').length;
  const moderateCount = results.filter(r => r.suspiciousLevel === 'moderate').length;
  const cleanCount = results.filter(r => !r.suspiciousLevel || r.suspiciousLevel === 'none').length;

  if (loading) return (
    <div className="flex">
      <Layout />
      <main className="flex-1 flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading results...</p>
      </main>
    </div>
  );

  return (
    <div className="flex">
      <Layout />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Student Results</h2>
            <p className="text-gray-500 text-sm mt-1">{results.length} total results</p>
          </div>
        </div>

        {/* Proctoring Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { level: 'none', icon: '✅', label: 'Clean Submissions', count: cleanCount, color: 'bg-green-100 text-green-700' },
            { level: 'moderate', icon: '⚠️', label: 'Moderate Suspicious', count: moderateCount, color: 'bg-yellow-100 text-yellow-700' },
            { level: 'high', icon: '🚨', label: 'Highly Suspicious', count: highCount, color: 'bg-red-100 text-red-700' },
          ].map(card => (
            <div key={card.level}
              className={`bg-white rounded-xl shadow p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition border-2 ${suspiciousFilter === card.level ? 'border-blue-400' : 'border-transparent'}`}
              onClick={() => setSuspiciousFilter(suspiciousFilter === card.level ? '' : card.level)}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${card.color}`}>{card.icon}</div>
              <div>
                <p className={`text-xl font-bold ${card.color.split(' ')[1]}`}>{card.count}</p>
                <p className="text-xs text-gray-400">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-48">
            <input className="w-full border rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="🔍 Search by student name or email..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            value={examFilter} onChange={e => setExamFilter(e.target.value)}>
            <option value="">All Exams</option>
            {exams.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}
          </select>
          <select className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
            value={suspiciousFilter} onChange={e => setSuspiciousFilter(e.target.value)}>
            <option value="">All Activity</option>
            <option value="none">✅ Clean</option>
            <option value="low">🕐 Time Up</option>
            <option value="moderate">⚠️ Moderate</option>
            <option value="high">🚨 Highly Suspicious</option>
          </select>
          {(search || examFilter || suspiciousFilter) && (
            <button onClick={() => { setSearch(''); setExamFilter(''); setSuspiciousFilter(''); }}
              className="text-sm text-red-400 hover:text-red-600 underline px-2">Clear filters</button>
          )}
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-5 py-4 text-left text-gray-500 font-medium">Student</th>
                <th className="px-5 py-4 text-left text-gray-500 font-medium">Exam</th>
                <th className="px-5 py-4 text-left text-gray-500 font-medium">Score</th>
                <th className="px-5 py-4 text-left text-gray-500 font-medium">Performance</th>
                <th className="px-5 py-4 text-left text-gray-500 font-medium">Grade</th>
                <th className="px-5 py-4 text-left text-gray-500 font-medium">Submit Activity</th>
                <th className="px-5 py-4 text-left text-gray-500 font-medium">Date</th>
                <th className="px-5 py-4 text-left text-gray-500 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">No results found.</td></tr>
              ) : filtered.map(r => {
                const pct = parseFloat(r.percentage || 0);
                const grade = pct >= 90 ? 'A+' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : 'F';
                const gradeColor = pct >= 60 ? 'text-green-600 bg-green-50' : pct >= 40 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50';
                const studentId = r.studentId?._id || r.studentId;
                const suspLevel = r.suspiciousLevel || 'none';
                const badge = SUSPICIOUS_BADGE[suspLevel] || SUSPICIOUS_BADGE.none;
                const isExpanded = expandedRow === r._id;

                return (
                  <>
                    <tr key={r._id} className={`hover:bg-gray-50 transition ${isExpanded ? 'bg-gray-50' : ''}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                            {r.studentId?.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{r.studentId?.name || 'N/A'}</p>
                            <p className="text-xs text-gray-400">{r.studentId?.email || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-gray-700">{r.examId?.title || 'N/A'}</td>
                      <td className="px-5 py-4 font-medium text-gray-800">{r.score}/{r.totalMarks}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div className={`h-2 rounded-full ${pct >= 60 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-gray-600 text-xs">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${gradeColor}`}>{grade}</span>
                      </td>

                      {/* Submit Activity Badge */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.style}`}>
                            {badge.label}
                          </span>
                          {r.submitReason && r.submitReason !== 'manual' && (
                            <span className="text-xs text-gray-400">{REASON_LABELS[r.submitReason] || r.submitReason}</span>
                          )}
                          {r.activityLog?.length > 0 && (
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : r._id)}
                              className="text-xs text-blue-500 hover:text-blue-700 text-left underline mt-0.5">
                              {isExpanded ? 'Hide ▲' : `${r.activityLog.length} activities ▼`}
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-gray-500 text-xs">
                        {new Date(r.submittedAt || r.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => navigate(`/institute/report/${studentId}`)}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700 font-medium">
                          📊 Report Card
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Activity Log */}
                    {isExpanded && r.activityLog?.length > 0 && (
                      <tr key={`${r._id}-log`}>
                        <td colSpan={8} className="px-5 py-3 bg-gray-50">
                          <div className="bg-white rounded-xl border border-gray-200 p-4">
                            <p className="text-xs font-semibold text-gray-600 mb-3 uppercase">
                              🔍 Activity Log — {r.activityLog.length} events
                            </p>
                            {r.suspiciousDetails && (
                              <div className={`rounded-lg p-3 mb-3 text-sm ${
                                suspLevel === 'high' ? 'bg-red-50 text-red-700 border border-red-200' :
                                suspLevel === 'moderate' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                <strong>Summary:</strong> {r.suspiciousDetails}
                              </div>
                            )}
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {r.activityLog.map((log, i) => (
                                <div key={i} className="flex items-start gap-3 text-xs">
                                  <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                                    log.type === 'tab_switch' ? 'bg-orange-400' :
                                    log.type === 'extension' ? 'bg-red-500' :
                                    log.type === 'devtools' ? 'bg-red-600' :
                                    log.type === 'fullscreen_exit' ? 'bg-yellow-400' :
                                    log.type === 'copy_paste' ? 'bg-purple-400' :
                                    'bg-gray-400'
                                  }`} />
                                  <span className="text-gray-400 flex-shrink-0 font-mono">
                                    {new Date(log.time).toLocaleTimeString('en-IN')}
                                  </span>
                                  <span className="text-gray-700">{log.message}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default InstituteResults;