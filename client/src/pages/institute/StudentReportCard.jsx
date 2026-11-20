import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import Sidebar from '../../components/Sidebar';
import Layout from '../../components/Layout';
import API from '../../api/axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend
} from 'recharts';

// const COLORS = ['#22c55e', '#ef4444', '#f59e0b'];

const StudentReportCard = () => {
  const { studentId } = useParams();
  const queryParams = new URLSearchParams(window.location.search);
  const examId = queryParams.get('examId');
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [institute, setInstitute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
  if (!studentId) return;
  fetchData();
}, [studentId, examId]);// eslint-disable-line react-hooks/exhaustive-deps

  const fetchData = async () => {
    try {
      const [studentsRes, resultsRes, instituteRes] = await Promise.all([
        API.get('/students'),
        API.get('/results'),
        API.get(`/institutes/${localStorage.getItem('instituteId') || ''}`).catch(() => ({ data: null }))
      ]);

      const found = studentsRes.data.find(s => s._id === studentId);
      setStudent(found);

      // Keep all institute results for class-rank calculation
        setResults(resultsRes.data);

        // Select only this student's results
        const studentResults = resultsRes.data.filter(
          r => String(r.studentId?._id || r.studentId) === String(studentId)
        );

        // Select the specific exam if examId is present in the URL
        const matchingExamResults = examId
          ? studentResults.filter(
              r => String(r.examId?._id || r.examId) === String(examId)
            )
          : studentResults;

        setSelectedExam(matchingExamResults[0] || null);

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

  // Overall stats for this student only

  const studentResults = results.filter(
  r => String(r.studentId?._id || r.studentId) === String(studentId)
);
const totalExams = studentResults.length;

const avgScore = totalExams > 0
  ? (
      studentResults.reduce(
        (sum, r) => sum + Number(r.percentage || 0),
        0
      ) / totalExams
    ).toFixed(1)
  : 0;

const bestScore = totalExams > 0
  ? Math.max(
      ...studentResults.map(r => Number(r.percentage || 0))
    ).toFixed(1)
  : 0;

const totalQuestions = studentResults.reduce(
  (sum, r) => sum + (r.answers?.length || 0),
  0
);

const totalCorrect = studentResults.reduce(
  (sum, r) =>
    sum + (r.answers?.filter(ans => ans.isCorrect === true).length || 0),
  0
);

// Per-exam bar chart data for this student only
const examChartData = studentResults.map(r => ({
  name: r.examId?.title
    ? r.examId.title.substring(0, 15) + '...'
    : 'Exam',
  score: Number(r.percentage || 0),
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

  const correct = result.answers.filter(
    a => a.isCorrect === true
  ).length;

  const skipped = result.answers.filter(
    a => !a.selectedAnswer
  ).length;

  const wrong = result.answers.filter(
    a => a.selectedAnswer && a.isCorrect === false
  ).length;

  return [
    { name: 'Correct', value: correct },
    { name: 'Wrong', value: wrong },
    { name: 'Skipped', value: skipped },
  ].filter(item => item.value > 0);
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
  // Class rank for the selected exam
const selectedExamId =
  selectedExam?.examId?._id || selectedExam?.examId;

const sameExamResults = results
  .filter(r =>
    (r.examId?._id || r.examId) === selectedExamId
  )
  .sort(
    (a, b) =>
      Number(b.percentage || 0) - Number(a.percentage || 0)
  );

const studentRank = sameExamResults.findIndex(
  r => r._id === selectedExam?._id
) + 1;

const studentsAhead = sameExamResults.filter(
  r => Number(r.percentage || 0) >
       Number(selectedExam?.percentage || 0)
).length;

const classComparison = sameExamResults.length > 0
  ? Math.round(
      ((sameExamResults.length - 1 - studentsAhead) /
        sameExamResults.length) * 100
    )
  : 0;

  // Download report card as HTML/Print
  const handleDownload = () => {
    // Chart data prepare
    const examLabels = studentResults.map(r => r.examId?.title ? r.examId.title.substring(0, 12) + '..' : 'Exam');
    const examScores = studentResults.map(r => parseFloat(r.percentage || 0));
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
          
          .charts-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
            align-items: start;
          }

          .chart-box {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
            min-width: 0;
          }

          .chart-box h4 {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.4px;
          }

          .chart-box canvas {
            display: block;
            max-height: 170px !important;
          }

          @media print {
            .charts-grid {
              gap: 12px;
              break-inside: avoid;
            }

            .chart-box {
              padding: 10px;
              box-shadow: none;
              break-inside: avoid;
            }

            .chart-box canvas {
              max-height: 150px !important;
            }
          }

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
            <canvas id="barChart" height="100"></canvas>
          </div>
          <div class="chart-box">
            <h4>Correct vs Wrong Answers</h4>
            <canvas id="pieChart" height="130"></canvas>
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
            maintainAspectRatio: true,
            aspectRatio: 2.2,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                ticks: {
                  callback: v => v + '%'
                }
              }
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
              maintainAspectRatio: true,
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

  const handleGenerateAiAnalysis = async () => {
  if (!selectedExam?._id) return;

  try {
    setAiLoading(true);
    setAiError('');
    setAiAnalysis(null);

    const response = await API.post(
      `/results/${selectedExam._id}/ai-analysis`
    );

    setAiAnalysis(response.data.analysis);
  } catch (error) {
    setAiError(
      error.response?.data?.message ||
      'AI analysis generate nahi ho paya. Please try again.'
    );
  } finally {
    setAiLoading(false);
  }
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

        {/* ===== PREMIUM STUDENT REPORT CARD HEADER ===== */}
        {(() => {
          const pct = Number(selectedExam?.percentage || 0);
          const recommendation =
            pct >= 85
              ? { label: 'Highly Recommended', emoji: '😄', color: 'text-green-700', bg: 'bg-green-50' }
              : pct >= 70
              ? { label: 'Recommended', emoji: '🙂', color: 'text-blue-700', bg: 'bg-blue-50' }
              : pct >= 50
              ? { label: 'Needs Improvement', emoji: '😐', color: 'text-amber-700', bg: 'bg-amber-50' }
              : { label: 'Further Practice Needed', emoji: '😟', color: 'text-red-700', bg: 'bg-red-50' };

          const difficultyScores = (selectedDifficulty || [])
            .filter(item => item.total > 0)
            .map(item => ({
              ...item,
              percentage: Math.round((item.correct / item.total) * 100)
            }));

          const strongest = [...difficultyScores].sort(
            (a, b) => b.percentage - a.percentage
          )[0];

          const weakest = [...difficultyScores].sort(
            (a, b) => a.percentage - b.percentage
          )[0];

          

          return (
            <>
              {/* Purple student profile header */}
              <div className="relative overflow-hidden rounded-3xl mb-6 shadow-xl bg-gradient-to-br from-purple-700 via-violet-600 to-fuchsia-600 text-white">
                <div className="absolute -right-12 -top-16 w-56 h-56 rounded-full bg-white/10" />
                <div className="absolute right-24 -bottom-24 w-48 h-48 rounded-full bg-white/10" />

                <div className="relative p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-3xl font-bold shadow-inner">
                        {student.name?.charAt(0).toUpperCase() || 'S'}
                      </div>

                      <div>
                        <p className="text-purple-100 text-sm mb-1">
                          STUDENT PERFORMANCE REPORT
                        </p>
                        <h2 className="text-2xl md:text-3xl font-bold">
                          {student.name}
                        </h2>
                        <p className="text-purple-100 text-sm mt-1 break-all">
                          {student.email}
                        </p>
                        {student.rollNumber && (
                          <p className="text-purple-100 text-sm mt-1">
                            Roll No: {student.rollNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="md:text-right">
                      <p className="text-purple-100 text-sm">Institute</p>
                      <p className="font-semibold">
                        {institute?.name || 'Institute'}
                      </p>
                      <p className="text-purple-100 text-xs mt-2">
                        Report generated: {new Date().toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 pt-5 border-t border-white/20 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-purple-100 text-xs">Selected Examination</p>
                      <p className="font-semibold mt-1">
                        {selectedExam?.examId?.title || 'Select an exam below'}
                      </p>
                    </div>
                    <div>
                      <p className="text-purple-100 text-xs">Subject</p>
                      <p className="font-semibold mt-1">
                        {selectedExam?.examId?.subject || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-purple-100 text-xs">Submission Date</p>
                      <p className="font-semibold mt-1">
                        {selectedExam
                          ? new Date(
                              selectedExam.submittedAt || selectedExam.createdAt
                            ).toLocaleDateString('en-IN')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Score and recommendation cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                {/* Test Score */}
                <div className="bg-white rounded-3xl border border-purple-100 shadow-sm p-6 flex flex-col items-center justify-center">
                  <h3 className="text-gray-700 font-bold text-lg">
                    Test Score
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    Selected examination
                  </p>

                  <div
                    className="w-36 h-36 rounded-full flex items-center justify-center my-5"
                    style={{
                      background: `conic-gradient(#9333ea ${Math.min(Math.max(pct, 0), 100) * 3.6}deg, #f3e8ff 0deg)`
                    }}
                  >
                    <div className="w-28 h-28 rounded-full bg-white flex flex-col items-center justify-center shadow-inner">
                      <span className="text-3xl font-extrabold text-purple-700">
                        {selectedExam ? `${pct}%` : '—'}
                      </span>
                      <span className="text-xs text-gray-400">Percentage</span>
                    </div>
                  </div>

                  <p className="text-xl font-bold text-gray-800">
                    {selectedExam
                      ? `${selectedExam.score ?? 0} / ${selectedExam.totalMarks ?? 0}`
                      : 'No exam selected'}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Obtained / Total Marks</p>
                </div>

                {/* Recommendation + hover details */}
                <div className="relative group">
                  <div
                    tabIndex={0}
                    className={`h-full min-h-64 rounded-3xl border border-purple-100 shadow-sm p-6 flex flex-col items-center justify-center text-center outline-none focus:ring-2 focus:ring-purple-400 ${recommendation.bg}`}
                  >
                    <h3 className="text-gray-700 font-bold text-lg">
                      Overall Test Recommendation
                    </h3>

                    <div className="text-7xl my-5" aria-label={recommendation.label}>
                      {selectedExam ? recommendation.emoji : '📝'}
                    </div>

                    <p className={`text-xl font-extrabold ${recommendation.color}`}>
                      {selectedExam ? recommendation.label : 'Select an examination'}
                    </p>

                    <p className="text-gray-500 text-sm mt-3">
                      Hover or focus here to view score details
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      On mobile, tap the card to view details
                    </p>
                  </div>

                  {/* Purple details overlay */}
                  <div className="absolute inset-0 z-10 rounded-3xl p-6 text-white bg-gradient-to-br from-violet-700 via-purple-700 to-fuchsia-700 shadow-xl flex flex-col justify-center opacity-0 invisible transition-all duration-300 group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible">
                    <h3 className="text-lg font-bold mb-5 text-center">
                      Test Score Details
                    </h3>

                    <div className="space-y-3">
                      <div className="rounded-xl bg-white/15 border border-white/20 p-3 flex items-center justify-between gap-3">
                        <span className="text-sm text-purple-100">Proctoring Score</span>
                        <span className="font-bold text-right">Not available</span>
                      </div>

                      <div className="rounded-xl bg-white/15 border border-white/20 p-3 flex items-center justify-between gap-3">
                        <span className="text-sm text-purple-100">Cut-off Score</span>
                        <span className="font-bold text-right">Not configured</span>
                      </div>

                      <div className="rounded-xl bg-white/15 border border-white/20 p-3 flex items-center justify-between gap-3">
                        <span className="text-sm text-purple-100">Total Score</span>
                        <span className="font-bold text-right">
                          {selectedExam
                            ? `${selectedExam.score ?? 0}/${selectedExam.totalMarks ?? 0}`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>

                    <p className="text-purple-100 text-xs text-center mt-4">
                      Actual stored values will be shown when available.
                    </p>
                  </div>
                </div>
              </div>

              {/* Class comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-purple-100 p-5 shadow-sm">
                  <p className="text-sm text-gray-500">Class Rank</p>
                  <p className="text-3xl font-extrabold text-purple-700 mt-2">
                    {sameExamResults.length > 1 && studentRank > 0
                      ? `#${studentRank}`
                      : '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Requires results from all students in this exam
                  </p>
                </div>

                <div className="bg-white rounded-2xl border border-purple-100 p-5 shadow-sm">
                  <p className="text-sm text-gray-500">
                    Students Comparison
                  </p>
                  <p className="text-3xl font-extrabold text-purple-700 mt-2">
                    {sameExamResults.length > 1
                      ? `${classComparison}%`
                      : '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Students ranked below this score
                  </p>
                </div>
              </div>

              {/* Stronger and weaker sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-5">
                  <h3 className="font-bold text-green-700 flex items-center gap-2">
                    <span>↗</span> Stronger Areas
                  </h3>

                  {strongest ? (
                    <div className="mt-4">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-medium text-gray-700">
                          {strongest.name} difficulty
                        </span>
                        <span className="font-bold text-green-700">
                          {strongest.percentage}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${strongest.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {strongest.correct} correct out of {strongest.total} questions
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 mt-3">
                      Difficulty data is not available for this exam.
                    </p>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5">
                  <h3 className="font-bold text-red-700 flex items-center gap-2">
                    <span>↘</span> Weaker Areas
                  </h3>

                  {weakest ? (
                    <div className="mt-4">
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="font-medium text-gray-700">
                          {weakest.name} difficulty
                        </span>
                        <span className="font-bold text-red-700">
                          {weakest.percentage}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${weakest.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {weakest.correct} correct out of {weakest.total} questions
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 mt-3">
                      Difficulty data is not available for this exam.
                    </p>
                  )}
                </div>
              </div>
            </>
          );
        })()}

        
{/* ===== AI RESULT ANALYSIS ===== */}
<section className="mt-8 rounded-2xl border border-purple-200 bg-white p-6 shadow-lg">
  <div className="mb-4">
    <h2 className="text-2xl font-bold text-purple-800">
      🤖 AI Result Analysis
    </h2>
    <p className="mt-1 text-sm text-gray-500">
      Personalized feedback based on the student's actual exam data.
    </p>
  </div>

  {!aiAnalysis && (
    <button
      type="button"
      onClick={handleGenerateAiAnalysis}
      disabled={aiLoading || !selectedExam}
      className="rounded-lg bg-purple-600 px-5 py-3 font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {aiLoading ? "Generating Analysis..." : "Generate AI Analysis"}
    </button>
  )}

  {aiError && (
    <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
      {aiError}
    </p>
  )}

  {aiAnalysis && (
    <div className="mt-6 space-y-6">
      {/* Overall Feedback */}
      <div className="rounded-xl bg-purple-50 p-4">
        <h3 className="font-bold text-purple-800">
          Overall Feedback
        </h3>
        <p className="mt-2 leading-7 text-gray-700">
          {aiAnalysis.overallFeedback}
        </p>
      </div>

      {/* Stronger Areas */}
      <div>
        <h3 className="font-bold text-green-700">
          ↗ Stronger Areas
        </h3>

        {aiAnalysis.strongerAreas?.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {aiAnalysis.strongerAreas.map((area, index) => (
              <li
                key={index}
                className="rounded-lg border border-green-100 bg-green-50 p-4"
              >
                <p className="font-semibold text-gray-800">
                  {area.name}
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {area.reason}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            Sufficient data is not available to identify stronger areas.
          </p>
        )}
      </div>

      {/* Areas to Improve */}
      <div>
        <h3 className="font-bold text-orange-700">
          ↘ Areas to Improve
        </h3>

        {aiAnalysis.weakerAreas?.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {aiAnalysis.weakerAreas.map((area, index) => (
              <li
                key={index}
                className="rounded-lg border border-orange-100 bg-orange-50 p-4"
              >
                <p className="font-semibold text-gray-800">
                  {area.name}
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {area.reason}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            No specific improvement areas identified.
          </p>
        )}
      </div>

      {/* Study Plan */}
      <div className="rounded-xl border border-blue-100 p-4">
        <h3 className="font-bold text-blue-700">
          📚 Recommended Study Plan
        </h3>

        {aiAnalysis.studyPlan?.length > 0 ? (
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-gray-700">
            {aiAnalysis.studyPlan.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            No study recommendations are available.
          </p>
        )}
      </div>

      {/* Data Limitations */}
      {aiAnalysis.dataLimitations?.length > 0 && (
        <div className="rounded-xl bg-gray-50 p-4">
          <h3 className="font-bold text-gray-700">
            ℹ️ Analysis Limitations
          </h3>

          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-600">
            {aiAnalysis.dataLimitations.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Regenerate */}
      <button
        type="button"
        onClick={handleGenerateAiAnalysis}
        disabled={aiLoading || !selectedExam}
        className="rounded-lg border border-purple-300 px-4 py-2 font-semibold text-purple-700 transition hover:bg-purple-50 disabled:opacity-60"
      >
        {aiLoading ? "Regenerating..." : "Regenerate Analysis"}
      </button>
    </div>
  )}
</section>



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
                value={selectedExam?._id || ''}
                onChange={e => {
                  const r = studentResults.find(
                    r => r._id === e.target.value
                  );
                  setSelectedExam(r || null);
                }}
              >
                {studentResults.map(r => (
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
                        {/* {selectedPie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)} */}
                        {selectedPie.map((item) => (
                          <Cell
                            key={item.name}
                            fill={
                              item.name === 'Correct'
                                ? '#22c55e'
                                : item.name === 'Wrong'
                                ? '#ef4444'
                                : '#f59e0b'
                            }
                          />
                        ))}
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