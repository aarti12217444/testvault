import { useEffect, useState } from 'react';
// import Sidebar from '../../components/Sidebar';
import Layout from '../../components/Layout';
import API from '../../api/axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const SuperDashboard = () => {
  const [institutes, setInstitutes] = useState([]);
  const [results, setResults] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [inst, res, usr] = await Promise.all([
        API.get('/institutes'),
        API.get('/results/all').catch(() => ({ data: [] })),
        API.get('/users/all').catch(() => ({ data: [] })),
      ]);
      setInstitutes(inst.data);
      setResults(res.data);
      setUsers(usr.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex">
      <Layout />
      <main className="flex-1 flex items-center justify-center min-h-screen">
        <p className="text-gray-400 text-lg">Loading dashboard...</p>
      </main>
    </div>
  );

  // Institute-wise stats
  const instituteStats = institutes.map((inst, idx) => {
    const instResults = results.filter(r =>
      r.instituteId === inst._id || r.instituteId?._id === inst._id
    );
    const instStudents = users.filter(u =>
      u.role === 'student' && (u.instituteId === inst._id || u.instituteId?._id === inst._id)
    );
    const avgScore = instResults.length > 0
      ? (instResults.reduce((a, r) => a + parseFloat(r.percentage || 0), 0) / instResults.length).toFixed(1)
      : 0;
    const passCount = instResults.filter(r => parseFloat(r.percentage) >= 60).length;
    const passRate = instResults.length > 0 ? ((passCount / instResults.length) * 100).toFixed(1) : 0;

    return {
      name: inst.name.length > 12 ? inst.name.substring(0, 12) + '..' : inst.name,
      fullName: inst.name,
      avgScore: parseFloat(avgScore),
      passRate: parseFloat(passRate),
      totalStudents: instStudents.length,
      totalExams: instResults.length,
      color: COLORS[idx % COLORS.length],
      _id: inst._id,
      type: inst.type || 'N/A',
    };
  });

  // Overall platform stats
  const totalStudents = users.filter(u => u.role === 'student').length;
  const totalInstitutes = institutes.length;
  const totalResults = results.length;
  const overallAvg = results.length > 0
    ? (results.reduce((a, r) => a + parseFloat(r.percentage || 0), 0) / results.length).toFixed(1)
    : 0;

  // Monthly trend (last 6 months)
  const getMonthlyData = () => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      const monthResults = results.filter(r => {
        const rd = new Date(r.createdAt);
        return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
      });
      const avg = monthResults.length > 0
        ? (monthResults.reduce((a, r) => a + parseFloat(r.percentage || 0), 0) / monthResults.length).toFixed(1)
        : 0;
      months.push({ month: label, exams: monthResults.length, avgScore: parseFloat(avg) });
    }
    return months;
  };

  // Score distribution
  const scoreDistribution = [
    { range: '0-40%', count: results.filter(r => r.percentage < 40).length, color: '#ef4444' },
    { range: '40-60%', count: results.filter(r => r.percentage >= 40 && r.percentage < 60).length, color: '#f59e0b' },
    { range: '60-75%', count: results.filter(r => r.percentage >= 60 && r.percentage < 75).length, color: '#3b82f6' },
    { range: '75-90%', count: results.filter(r => r.percentage >= 75 && r.percentage < 90).length, color: '#22c55e' },
    { range: '90-100%', count: results.filter(r => r.percentage >= 90).length, color: '#8b5cf6' },
  ];

  const monthlyData = getMonthlyData();

  return (
    <div className="flex">
      <Layout />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Super Admin Dashboard</h2>
        <p className="text-gray-500 text-sm mb-8">Platform-wide analytics & institute performance</p>

        {/* ===== TOP STATS ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
          {[
            { label: 'Total Institutes', value: totalInstitutes, icon: '🏫', color: 'bg-blue-500', light: 'bg-blue-50 text-blue-700' },
            { label: 'Total Students', value: totalStudents, icon: '👨‍🎓', color: 'bg-green-500', light: 'bg-green-50 text-green-700' },
            { label: 'Total Exams Taken', value: totalResults, icon: '📝', color: 'bg-purple-500', light: 'bg-purple-50 text-purple-700' },
            { label: 'Platform Avg Score', value: `${overallAvg}%`, icon: '📊', color: 'bg-orange-500', light: 'bg-orange-50 text-orange-700' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl shadow p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${stat.light} flex items-center justify-center text-2xl`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-sm text-gray-400">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ===== INSTITUTE AVG SCORE BAR CHART ===== */}
        {instituteStats.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h3 className="font-bold text-gray-700 mb-1 text-lg">🏫 Institute-wise Average Score</h3>
            <p className="text-sm text-gray-400 mb-4">Comparison of all institutes by average exam score</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={instituteStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip
                  formatter={(val) => [`${val}%`]}
                  labelFormatter={(label) => {
                    const inst = instituteStats.find(i => i.name === label);
                    return inst?.fullName || label;
                  }}
                />
                <Bar dataKey="avgScore" name="Avg Score" radius={[6, 6, 0, 0]}>
                  {instituteStats.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

          {/* ===== PASS RATE COMPARISON ===== */}
          {instituteStats.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h3 className="font-bold text-gray-700 mb-4 text-lg">✅ Pass Rate by Institute</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={instituteStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="name" type="category" width={70} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val) => [`${val}%`, 'Pass Rate']} />
                  <Bar dataKey="passRate" name="Pass Rate" radius={[0, 6, 6, 0]}>
                    {instituteStats.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ===== SCORE DISTRIBUTION PIE ===== */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="font-bold text-gray-700 mb-4 text-lg">📊 Score Distribution</h3>
            {results.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={scoreDistribution}
                    cx="50%" cy="50%"
                    outerRadius={80}
                    dataKey="count"
                    label={({ range, count }) => count > 0 ? `${range}: ${count}` : ''}>
                    {scoreDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val, name, props) => [val, props.payload.range]} />
                  <Legend formatter={(val, entry) => entry.payload.range} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400">No exam data yet</div>
            )}
          </div>
        </div>

        {/* ===== MONTHLY TREND LINE CHART ===== */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h3 className="font-bold text-gray-700 mb-1 text-lg">📈 Monthly Exam Activity</h3>
          <p className="text-sm text-gray-400 mb-4">Last 6 months — exams taken & average score</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tickFormatter={v => `${v}%`} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="avgScore" stroke="#3b82f6" strokeWidth={2}
                name="Avg Score %" dot={{ fill: '#3b82f6', r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="exams" stroke="#22c55e" strokeWidth={2}
                name="Exams Taken" dot={{ fill: '#22c55e', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* ===== TOP INSTITUTES TABLE ===== */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="font-bold text-gray-700 mb-4 text-lg">🏆 Institute Rankings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Rank</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Institute</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Type</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Students</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Exams Taken</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Avg Score</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...instituteStats]
                  .sort((a, b) => b.avgScore - a.avgScore)
                  .map((inst, idx) => (
                    <tr key={inst._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                          ${idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                            idx === 1 ? 'bg-gray-200 text-gray-600' :
                            idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{inst.fullName}</td>
                      <td className="px-4 py-3 text-gray-500">{inst.type}</td>
                      <td className="px-4 py-3 text-gray-600">{inst.totalStudents}</td>
                      <td className="px-4 py-3 text-gray-600">{inst.totalExams}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div className="h-2 rounded-full bg-blue-500"
                              style={{ width: `${inst.avgScore}%` }} />
                          </div>
                          <span className="font-medium text-gray-700">{inst.avgScore}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium
                          ${inst.passRate >= 60 ? 'bg-green-100 text-green-700' :
                            inst.passRate >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                          {inst.passRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                {instituteStats.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-400">No institutes found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperDashboard;