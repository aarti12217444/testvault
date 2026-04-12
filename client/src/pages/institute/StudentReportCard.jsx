import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import Sidebar from '../../components/Sidebar';
import Layout from '../../components/Layout';
import API from '../../api/axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#22c55e', '#ef4444', '#f59e0b'];

const StudentReportCard = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [institute, setInstitute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    fetchData(); // eslint-disable-line react-hooks/exhaustive-deps
  }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      const [studentsRes, resultsRes, instituteRes] = await Promise.all([
        API.get('/students'),
        API.get('/results'),
        API.get(`/institutes/${localStorage.getItem('instituteId') || ''}`).catch(() => ({ data: null }))
      ]);

      const found = studentsRes.data.find(s => s._id === studentId);
      setStudent(found);

      const studentResults = resultsRes.data.filter(r =>
        r.studentId === studentId || r.studentId?._id === studentId
      );
      setResults(studentResults);
      if (studentResults.length > 0) setSelectedExam(studentResults[0]);
      setInstitute(instituteRes.data);
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
        <div className="text-gray-400 text-lg">Loading report card...</div>
      </main>
    </div>
  );

  if (!student) return (
    <div className="flex">
      <Layout />
      <main className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-red-500">Student not found!</div>
      </main>
    </div>
  );

  // Overall stats
  const totalExams = results.length;
  const avgScore = totalExams > 0
    ? (results.reduce((a, r) => a + parseFloat(r.percentage || 0), 0) / totalExams).toFixed(1)
    : 0;
  const bestScore = totalExams > 0
    ? Math.max(...results.map(r => parseFloat(r.percentage || 0))).toFixed(1)
    : 0;
  const totalQuestions = results.reduce((a, r) => a + (r.answers?.length || 0), 0);
  const totalCorrect = results.reduce((a, r) => a + (r.answers?.filter(ans => ans.isCorrect).length || 0), 0);

  // Per-exam bar chart data
  const examChartData = results.map(r => ({
    name: r.examId?.title ? r.examId.title.substring(0, 15) + '...' : 'Exam',
    score: parseFloat(r.percentage || 0),
    marks: r.score,
    total: r.totalMarks,
  }));

  // Difficulty breakdown for selected exam
  const getDifficultyData = (result) => {
    if (!result?.answers) return [];
    const easy = result.answers.filter(a => a.questionId?.difficulty === 'Easy');
    const medium = result.answers.filter(a => a.questionId?.difficulty === 'Medium');
    const hard = result.answers.filter(a => a.questionId?.difficulty === 'Hard');
    return [
      { name: 'Easy', correct: easy.filter(a => a.isCorrect).length, wrong: easy.filter(a => !a.isCorrect).length, total: easy.length },
      { name: 'Medium', correct: medium.filter(a => a.isCorrect).length, wrong: medium.filter(a => !a.isCorrect).length, total: medium.length },
      { name: 'Hard', correct: hard.filter(a => a.isCorrect).length, wrong: hard.filter(a => !a.isCorrect).length, total: hard.length },
    ].filter(d => d.total > 0);
  };

  // Correct vs Wrong pie for selected exam
  const getPieData = (result) => {
    if (!result?.answers) return [];
    const correct = result.answers.filter(a => a.isCorrect).length;
    const wrong = result.answers.filter(a => !a.isCorrect).length;
    const skipped = result.answers.filter(a => !a.selectedAnswer).length;
    return [
      { name: 'Correct', value: correct },
      { name: 'Wrong', value: wrong - skipped },
      { name: 'Skipped', value: skipped },
    ].filter(d => d.value > 0);
  };

  // Rank calculation
  const getRankBadge = (pct) => {
    if (pct >= 90) return { label: 'Outstanding', color: 'text-yellow-600 bg-yellow-50', icon: '🏆' };
    if (pct >= 75) return { label: 'Excellent', color: 'text-green-600 bg-green-50', icon: '⭐' };
    if (pct >= 60) return { label: 'Good', color: 'text-blue-600 bg-blue-50', icon: '👍' };
    if (pct >= 40) return { label: 'Average', color: 'text-orange-600 bg-orange-50', icon: '📊' };
    return { label: 'Needs Improvement', color: 'text-red-600 bg-red-50', icon: '📚' };
  };

  const badge = getRankBadge(parseFloat(avgScore));
  const selectedDifficulty = getDifficultyData(selectedExam);
  const selectedPie = getPieData(selectedExam);

  // Download report card as HTML/Print
  const handleDownload = () => {
    // Chart data prepare
    const examLabels = results.map(r => r.examId?.title ? r.examId.title.substring(0, 12) + '..' : 'Exam');
    const examScores = results.map(r => parseFloat(r.percentage || 0));
    const examColors = examScores.map(s => s >= 60 ? '#22c55e' : s >= 40 ? '#f59e0b' : '#ef4444');

    const correctTotal = results.reduce((a, r) => a + (r.answers?.filter(ans => ans.isCorrect).length || 0), 0);
    const wrongTotal = totalQuestions - correctTotal;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Report Card - ${student.name}</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 30px; color: #333; background: #f8fafc; }
          .header { background: linear-gradient(135deg, #1e3a5f, #2563eb); color: white; padding: 28px; border-radius: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
          .header h1 { font-size: 22px; margin-bottom: 4px; }
          .header p { font-size: 12px; opacity: 0.8; }
          .badge { display: inline-block; background: rgba(255,255,255,0.2); color: white; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-top: 8px; }
          .student-card { background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 5px solid #2563eb; box-shadow: 0 1px 4px rgba(0,0,0,0.08); display: flex; justify-content: space-between; align-items: flex-start; }
          .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 24px; }
          .stat-box { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
          .stat-box .value { font-size: 22px; font-weight: bold; color: #1e3a5f; }
          .stat-box .label { font-size: 11px; color: #94a3b8; margin-top: 4px; }
          .section-title { font-size: 15px; font-weight: bold; color: #1e3a5f; margin: 24px 0 12px; border-left: 4px solid #3b82f6; padding-left: 10px; background: white; padding: 10px 10px 10px 14px; border-radius: 0 8px 8px 0; }
          .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
          .chart-box { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
          .chart-box h4 { font-size: 13px; color: #64748b; margin-bottom: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
          th { background: #1e3a5f; color: white; padding: 12px 14px; text-align: left; font-size: 12px; }
          td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
          tr:hover td { background: #f8fafc; }
          .grade { display: inline-block; padding: 2px 10px; border-radius: 20px; font-weight: bold; font-size: 12px; }
          .grade-aplus { background: #fef9c3; color: #854d0e; }
          .grade-a { background: #dcfce7; color: #16a34a; }
          .grade-b { background: #dbeafe; color: #1d4ed8; }
          .grade-c { background: #fff7ed; color: #c2410c; }
          .grade-f { background: #fee2e2; color: #dc2626; }
          .progress-bar { background: #e2e8f0; border-radius: 99px; height: 8px; width: 100px; display: inline-block; overflow: hidden; vertical-align: middle; margin-right: 8px; }
          .progress-fill { height: 100%; border-radius: 99px; }
          .footer { margin-top: 30px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        </style>
      </head>
      <body>

        <div class="header">
          <div>
            <h1>📚 Student Report Card</h1>
            <p>${institute?.name || 'ExamPlatform'} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
          <div style="text-align:right;">
            <div class="badge">${badge.icon} ${badge.label}</div>
          </div>
        </div>

        <!-- Student Info -->
        <div class="student-card">
          <div>
            <h2 style="font-size:20px; color:#1e3a5f; margin-bottom:6px;">${student.name}</h2>
            <p style="color:#64748b; font-size:13px;">📧 ${student.email}</p>
            ${student.rollNumber ? `<p style="color:#64748b; font-size:13px; margin-top:3px;">🎓 Roll No: ${student.rollNumber}</p>` : ''}
            <p style="color:#64748b; font-size:13px; margin-top:3px;">🏫 ${institute?.name || 'Institute'}</p>
          </div>
          <div style="text-align:right; font-size:12px; color:#94a3b8;">
            <p>Report Date</p>
            <p style="font-size:16px; font-weight:bold; color:#1e3a5f;">${new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </div>

        <!-- Stats -->
        <div class="section-title">📊 Overall Performance</div>
        <div class="stats">
          <div class="stat-box"><div class="value">${totalExams}</div><div class="label">Total Exams</div></div>
          <div class="stat-box"><div class="value" style="color:${parseFloat(avgScore) >= 60 ? '#16a34a' : parseFloat(avgScore) >= 40 ? '#d97706' : '#dc2626'}">${avgScore}%</div><div class="label">Avg Score</div></div>
          <div class="stat-box"><div class="value" style="color:#d97706">${bestScore}%</div><div class="label">Best Score</div></div>
          <div class="stat-box"><div class="value">${totalQuestions}</div><div class="label">Total Qs</div></div>
          <div class="stat-box"><div class="value" style="color:#16a34a">${totalCorrect}</div><div class="label">Correct</div></div>
        </div>

        <!-- Charts -->
        <div class="section-title">📈 Performance Charts</div>
        <div class="charts-grid">
          <div class="chart-box">
            <h4>Exam-wise Score (%)</h4>
            <canvas id="barChart" height="180"></canvas>
          </div>
          <div class="chart-box">
            <h4>Correct vs Wrong Answers</h4>
            <canvas id="pieChart" height="180"></canvas>
          </div>
        </div>

        <!-- Exam Table -->
        <div class="section-title">📋 Exam Records</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Exam Name</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Grade</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${results.map((r, i) => {
              const pct = parseFloat(r.percentage || 0);
              const grade = pct >= 90 ? 'A+' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : 'F';
              const gradeClass = pct >= 90 ? 'grade-aplus' : pct >= 75 ? 'grade-a' : pct >= 60 ? 'grade-b' : pct >= 40 ? 'grade-c' : 'grade-f';
              const barColor = pct >= 60 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
              return `
                <tr>
                  <td>${i + 1}</td>
                  <td style="font-weight:500">${r.examId?.title || 'Exam'}</td>
                  <td>${r.score}/${r.totalMarks}</td>
                  <td>
                    <span class="progress-bar"><span class="progress-fill" style="width:${pct}%; background:${barColor}"></span></span>
                    ${pct}%
                  </td>
                  <td><span class="grade ${gradeClass}">${grade}</span></td>
                  <td style="color:#94a3b8">${new Date(r.submittedAt || r.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          Generated by ExamPlatform &nbsp;•&nbsp; ${institute?.name || ''} &nbsp;•&nbsp; ${new Date().toLocaleString('en-IN')}
        </div>

        <script>
          // Bar Chart — Exam wise scores
          new Chart(document.getElementById('barChart'), {
            type: 'bar',
            data: {
              labels: ${JSON.stringify(examLabels)},
              datasets: [{
                label: 'Score %',
                data: ${JSON.stringify(examScores)},
                backgroundColor: ${JSON.stringify(examColors)},
                borderRadius: 6,
              }]
            },
            options: {
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%' } }
              }
            }
          });

          // Pie Chart — Correct vs Wrong
          new Chart(document.getElementById('pieChart'), {
            type: 'doughnut',
            data: {
              labels: ['Correct', 'Wrong'],
              datasets: [{
                data: [${correctTotal}, ${wrongTotal}],
                backgroundColor: ['#22c55e', '#ef4444'],
                borderWidth: 2,
                borderColor: '#fff'
              }]
            },
            options: {
              responsive: true,
              plugins: {
                legend: { position: 'bottom' },
                tooltip: { callbacks: { label: ctx => ctx.label + ': ' + ctx.raw + ' questions' } }
              }
            }
          });
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([printContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Sirf download karo — no cross-origin print
    const a = document.createElement('a');
    a.href = url;
    a.download = `ReportCard_${student.name.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flex">
      <Layout />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">

        {/* Back Button + Download */}
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm">
            ← Back to Results
          </button>
          <button onClick={handleDownload}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 text-sm font-medium shadow">
            ⬇️ Download Report Card
          </button>
        </div>

        {/* ===== REPORT CARD HEADER ===== */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6 border-t-4 border-blue-500">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600">
                {student.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{student.name}</h2>
                <p className="text-gray-500 text-sm">{student.email}</p>
                {student.rollNumber && <p className="text-gray-500 text-sm">Roll No: {student.rollNumber}</p>}
                <p className="text-gray-500 text-sm">📍 {institute?.name || 'Institute'}</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${badge.color}`}>
                {badge.icon} {badge.label}
              </span>
              <p className="text-gray-400 text-xs mt-2">
                Report generated: {new Date().toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            {[
              { label: 'Total Exams', value: totalExams, icon: '📝', color: 'text-blue-600' },
              { label: 'Avg Score', value: `${avgScore}%`, icon: '📊', color: 'text-purple-600' },
              { label: 'Best Score', value: `${bestScore}%`, icon: '🏆', color: 'text-yellow-600' },
              { label: 'Total Questions', value: totalQuestions, icon: '❓', color: 'text-gray-600' },
              { label: 'Correct Answers', value: totalCorrect, icon: '✅', color: 'text-green-600' },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl mb-1">{stat.icon}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ===== EXAM PERFORMANCE BAR CHART ===== */}
        {examChartData.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h3 className="font-bold text-gray-700 mb-4 text-lg">📈 Exam-wise Performance</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={examChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(val) => [`${val}%`, 'Score']} />
                <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]}
                  label={{ position: 'top', formatter: (v) => `${v}%`, fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ===== PER EXAM DETAIL ===== */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
              <h3 className="font-bold text-gray-700 text-lg">🔍 Detailed Analysis</h3>
              <select
                className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                onChange={e => {
                  const r = results.find(r => r._id === e.target.value);
                  setSelectedExam(r);
                }}>
                {results.map(r => (
                  <option key={r._id} value={r._id}>
                    {r.examId?.title || 'Exam'} — {r.percentage}%
                  </option>
                ))}
              </select>
            </div>

            {selectedExam && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Correct vs Wrong Pie */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase">Answer Breakdown</h4>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={selectedPie} cx="50%" cy="50%" outerRadius={80}
                        dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {selectedPie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Difficulty Breakdown Bar */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase">Difficulty-wise Performance</h4>
                  {selectedDifficulty.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={selectedDifficulty} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={60} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="correct" fill="#22c55e" name="Correct" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="wrong" fill="#ef4444" name="Wrong" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400">
                      <p>Difficulty data not available</p>
                      <p className="text-xs mt-1">(Questions need difficulty field populated)</p>
                    </div>
                  )}
                </div>

                {/* Exam Summary Box */}
                <div className="md:col-span-2 bg-gray-50 rounded-xl p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    {[
                      { label: 'Score', value: `${selectedExam.score}/${selectedExam.totalMarks}` },
                      { label: 'Percentage', value: `${selectedExam.percentage}%` },
                      { label: 'Time Taken', value: selectedExam.timeTaken ? `${Math.floor(selectedExam.timeTaken / 60)}m ${selectedExam.timeTaken % 60}s` : 'N/A' },
                      { label: 'Submitted', value: new Date(selectedExam.submittedAt || selectedExam.createdAt).toLocaleDateString('en-IN') },
                    ].map(item => (
                      <div key={item.label}>
                        <p className="text-lg font-bold text-gray-800">{item.value}</p>
                        <p className="text-xs text-gray-400">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Performance</span>
                      <span>{selectedExam.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${
                          selectedExam.percentage >= 60 ? 'bg-green-500' :
                          selectedExam.percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${selectedExam.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== ALL EXAMS TABLE ===== */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="font-bold text-gray-700 mb-4 text-lg">📋 All Exam Records</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-4 py-3 text-gray-500 font-medium">Exam</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Score</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Percentage</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Grade</th>
                    <th className="px-4 py-3 text-gray-500 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {results.map(r => {
                    const pct = parseFloat(r.percentage || 0);
                    const grade = pct >= 90 ? 'A+' : pct >= 75 ? 'A' : pct >= 60 ? 'B' : pct >= 40 ? 'C' : 'F';
                    const gradeColor = pct >= 60 ? 'text-green-600 bg-green-50' : pct >= 40 ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50';
                    return (
                      <tr key={r._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-700">{r.examId?.title || 'Exam'}</td>
                        <td className="px-4 py-3 text-gray-600">{r.score}/{r.totalMarks}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${pct >= 60 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-gray-700">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${gradeColor}`}>{grade}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(r.submittedAt || r.createdAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {results.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-lg">No exam results found for this student.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentReportCard;