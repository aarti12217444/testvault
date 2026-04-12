import { useEffect, useState } from 'react';
// import Sidebar from '../../components/Sidebar';
import Layout from '../../components/Layout';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import jsPDF from 'jspdf';

const MyResults = () => {
  const [results, setResults] = useState([]);
  const [pendingExams, setPendingExams] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [resultsRes, examsRes] = await Promise.all([
        API.get('/results/my-results'), // sirf declared
        API.get('/exams/my-exams'),
      ]);
      setResults(resultsRes.data);

      // Pending = attempted but result not declared yet
      const attemptedExamIds = resultsRes.data.map(r => r.examId?._id || r.examId);
      const pending = examsRes.data.filter(e => {
        const isAttempted = attemptedExamIds.includes(e._id);
        const isDeclared = e.resultDeclared;
        return isAttempted && !isDeclared;
      });
      setPendingExams(pending);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  const getGrade = (p) => {
    if (p >= 90) return { grade: 'A+', color: 'text-green-600', bg: 'bg-green-50' };
    if (p >= 80) return { grade: 'A', color: 'text-green-500', bg: 'bg-green-50' };
    if (p >= 70) return { grade: 'B+', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (p >= 60) return { grade: 'B', color: 'text-blue-500', bg: 'bg-blue-50' };
    if (p >= 50) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (p >= 40) return { grade: 'D', color: 'text-orange-500', bg: 'bg-orange-50' };
    return { grade: 'F', color: 'text-red-600', bg: 'bg-red-50' };
  };

  const downloadCertificate = (result) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297; const H = 210;
    const pct = parseFloat(result.percentage);
    const grade = getGrade(pct).grade;
    const date = new Date(result.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, W, H, 'F');
    doc.setDrawColor(37, 99, 235); doc.setLineWidth(3); doc.rect(8, 8, W - 16, H - 16);
    doc.setDrawColor(147, 197, 253); doc.setLineWidth(1); doc.rect(12, 12, W - 24, H - 24);
    [[14, 14], [W - 14, 14], [14, H - 14], [W - 14, H - 14]].forEach(([x, y]) => {
      doc.setFillColor(234, 179, 8); doc.circle(x, y, 3, 'F');
    });
    doc.setFillColor(30, 58, 95); doc.rect(8, 8, W - 16, 28, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICATE OF ACHIEVEMENT', W / 2, 22, { align: 'center' });
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(147, 197, 253);
    doc.text('ExamPlatform - Excellence in Education', W / 2, 31, { align: 'center' });
    doc.setTextColor(100, 116, 139); doc.setFontSize(12); doc.setFont('helvetica', 'italic');
    doc.text('This is to proudly certify that', W / 2, 52, { align: 'center' });
    doc.setTextColor(30, 58, 95); doc.setFontSize(30); doc.setFont('helvetica', 'bold');
    const studentName = result.studentName || user?.name || 'Student';
    doc.text(studentName, W / 2, 68, { align: 'center' });
    const nameWidth = doc.getTextWidth(studentName);
    doc.setDrawColor(37, 99, 235); doc.setLineWidth(0.8);
    doc.line((W - nameWidth) / 2, 71, (W + nameWidth) / 2, 71);
    doc.setTextColor(100, 116, 139); doc.setFontSize(12); doc.setFont('helvetica', 'italic');
    doc.text('has successfully completed the examination', W / 2, 81, { align: 'center' });
    doc.setTextColor(37, 99, 235); doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text(`"${result.examId?.title || 'Examination'}"`, W / 2, 93, { align: 'center' });
    doc.setTextColor(71, 85, 105); doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text(`Subject: ${result.examId?.subject || 'N/A'}`, W / 2, 101, { align: 'center' });
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.5); doc.line(40, 108, W - 40, 108);
    const stats = [
      { label: 'Score', value: `${result.score} / ${result.totalMarks}` },
      { label: 'Percentage', value: `${pct}%` },
      { label: 'Grade', value: grade },
      { label: 'Institute', value: result.instituteName || 'Institute' },
    ];
    const colW = (W - 80) / stats.length;
    stats.forEach((stat, i) => {
      const x = 40 + i * colW + colW / 2;
      doc.setFillColor(239, 246, 255); doc.setDrawColor(191, 219, 254); doc.setLineWidth(0.5);
      doc.roundedRect(40 + i * colW + 4, 112, colW - 8, 22, 3, 3, 'FD');
      doc.setTextColor(37, 99, 235); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text(stat.value, x, 121, { align: 'center' });
      doc.setTextColor(100, 116, 139); doc.setFontSize(8); doc.setFont('helvetica', 'normal');
      doc.text(stat.label, x, 129, { align: 'center' });
    });
    doc.setTextColor(100, 116, 139); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.text(`Date of Completion: ${date}`, W / 2, 146, { align: 'center' });
    doc.setFillColor(248, 250, 252); doc.rect(8, H - 28, W - 16, 20, 'F');
    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3);
    doc.line(30, H - 20, 90, H - 20); doc.line(W - 90, H - 20, W - 30, H - 20);
    doc.setTextColor(100, 116, 139); doc.setFontSize(8);
    doc.text('Authorized Signature', 60, H - 15, { align: 'center' });
    doc.text('ExamPlatform Director', W - 60, H - 15, { align: 'center' });
    doc.setTextColor(148, 163, 184); doc.setFontSize(7);
    doc.text(`Certificate ID: EP-${result._id?.toString().slice(-8).toUpperCase()}`, W / 2, H - 11, { align: 'center' });
    doc.save(`Certificate_${(result.examId?.title || 'Exam').replace(/\s+/g, '_')}.pdf`);
  };

  const avgScore = results.length > 0
    ? (results.reduce((a, r) => a + parseFloat(r.percentage), 0) / results.length).toFixed(1) : 0;
  const bestScore = results.length > 0
    ? Math.max(...results.map(r => parseFloat(r.percentage))) : 0;
  const totalTime = results.reduce((a, r) => a + (r.timeTaken || 0), 0);
  const correctTotal = results.reduce((a, r) => a + (r.score || 0), 0);
  const totalQs = results.reduce((a, r) => a + (r.totalMarks || 0), 0);

  if (loading) return (
    <div className="flex">
      <Layout />
      <main className="flex-1 p-8 flex items-center justify-center">
        <p className="text-gray-400">Loading results...</p>
      </main>
    </div>
  );

  return (
    <div className="flex">
      <Layout />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">📊 My Exam Results</h2>
        <p className="text-gray-500 text-sm mb-6">Results are visible only after institute declares them</p>

        {/* Pending Results — awaiting declaration */}
        {pendingExams.length > 0 && (
          <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-600 mb-3">⏳ Awaiting Result Declaration ({pendingExams.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pendingExams.map(exam => (
                <div key={exam._id} className="bg-white rounded-xl shadow p-4 border-2 border-dashed border-yellow-300">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-gray-700">{exam.title}</h4>
                      <p className="text-sm text-gray-400 mt-1">{exam.subject}</p>
                    </div>
                    <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">⏳ Pending</span>
                  </div>
                  {exam.resultDeclareAt && (
                    <div className="mt-3 bg-blue-50 rounded-lg p-2 text-xs text-blue-600">
                      📅 Result expected: {new Date(exam.resultDeclareAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true
                      })}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">Your result will appear here once institute declares it</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No declared results */}
        {results.length === 0 && pendingExams.length === 0 && (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <p className="text-5xl mb-4">📝</p>
            <p className="text-gray-500">No results yet. Give your first exam!</p>
          </div>
        )}

        {results.length === 0 && pendingExams.length > 0 && (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
            <p className="text-3xl mb-3">🔒</p>
            <p>No declared results yet. Results will appear once your institute declares them.</p>
          </div>
        )}

        {results.length > 0 && (
          <>
            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow p-5 text-center">
                <p className="text-3xl font-bold text-blue-600">{results.length}</p>
                <p className="text-xs text-gray-500 mt-1">Results Declared</p>
              </div>
              <div className="bg-white rounded-xl shadow p-5 text-center">
                <p className="text-3xl font-bold text-purple-600">{avgScore}%</p>
                <p className="text-xs text-gray-500 mt-1">Average Score</p>
              </div>
              <div className="bg-white rounded-xl shadow p-5 text-center">
                <p className="text-3xl font-bold text-green-600">{bestScore}%</p>
                <p className="text-xs text-gray-500 mt-1">Best Score</p>
              </div>
              <div className="bg-white rounded-xl shadow p-5 text-center">
                <p className="text-3xl font-bold text-orange-500">{formatTime(totalTime)}</p>
                <p className="text-xs text-gray-500 mt-1">Total Time</p>
              </div>
            </div>

            {/* Overall Performance */}
            <div className="bg-white rounded-xl shadow p-6 mb-6">
              <h3 className="font-bold text-gray-800 mb-4">✅ Overall Performance</h3>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-green-600 font-medium">✅ Correct: {correctTotal}</span>
                    <span className="text-red-500 font-medium">❌ Wrong: {totalQs - correctTotal}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div className="bg-green-500 h-4 rounded-full transition-all"
                      style={{ width: `${totalQs > 0 ? (correctTotal / totalQs) * 100 : 0}%` }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {totalQs > 0 ? ((correctTotal / totalQs) * 100).toFixed(1) : 0}% accuracy across all exams
                  </p>
                </div>
              </div>

              <h4 className="font-semibold text-gray-700 mt-6 mb-3">📚 Subject Wise Performance</h4>
              <div className="space-y-3">
                {results.map((r, i) => {
                  const pct = parseFloat(r.percentage);
                  const g = getGrade(pct);
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 font-medium">
                          {r.examId?.subject || 'N/A'} — {r.examId?.title || 'Exam'}
                        </span>
                        <span className={`font-bold ${g.color}`}>{pct}% ({g.grade})</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div className={`h-3 rounded-full transition-all ${pct >= 60 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Results Cards */}
            <h3 className="font-bold text-gray-800 mb-4">📋 Declared Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {results.map((r, i) => {
                const pct = parseFloat(r.percentage);
                const g = getGrade(pct);
                return (
                  <div key={i}
                    onClick={() => setSelected(selected?._id === r._id ? null : r)}
                    className={`bg-white rounded-xl shadow p-5 cursor-pointer hover:shadow-md transition border-2 ${selected?._id === r._id ? 'border-blue-500' : 'border-transparent'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-800">{r.examId?.title || 'Exam'}</h4>
                        <p className="text-sm text-gray-500">{r.examId?.subject}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          📅 Declared: {new Date(r.examId?.resultDeclaredAt || r.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div className={`${g.bg} ${g.color} text-3xl font-black px-4 py-2 rounded-xl`}>
                        {g.grade}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="font-bold text-gray-800">{r.score}/{r.totalMarks}</p>
                        <p className="text-xs text-gray-400">Score</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className={`font-bold ${g.color}`}>{pct}%</p>
                        <p className="text-xs text-gray-400">Percentage</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="font-bold text-gray-800">{formatTime(r.timeTaken)}</p>
                        <p className="text-xs text-gray-400">Time</p>
                      </div>
                    </div>

                    <div className="mt-3 w-full bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${pct >= 60 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${pct}%` }} />
                    </div>

                    {pct >= 40 && (
                      <button onClick={(e) => { e.stopPropagation(); downloadCertificate(r); }}
                        className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-xs font-medium transition flex items-center justify-center gap-2">
                        🎓 Download Certificate
                      </button>
                    )}
                    <p className="text-xs text-blue-500 mt-2 text-center">
                      {selected?._id === r._id ? '▲ Hide Details' : '▼ View Details'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Detailed Analysis */}
            {selected && (
              <div className="bg-white rounded-xl shadow p-6 mb-6 border-2 border-blue-200">
                <h3 className="font-bold text-gray-800 mb-4">🔍 Detailed Analysis — {selected.examId?.title}</h3>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{selected.score}</p>
                    <p className="text-xs text-gray-500 mt-1">✅ Correct</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-red-500">{selected.totalMarks - selected.score}</p>
                    <p className="text-xs text-gray-500 mt-1">❌ Wrong / Skipped</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{formatTime(selected.timeTaken)}</p>
                    <p className="text-xs text-gray-500 mt-1">⏱ Time Taken</p>
                  </div>
                </div>

                {selected.answers && selected.answers.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">📝 Question Breakdown</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {selected.answers.map((ans, i) => (
                        <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${ans.isCorrect ? 'bg-green-50' : 'bg-red-50'}`}>
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${ans.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <span className={`text-sm font-medium ${ans.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                              {ans.isCorrect ? '✅ Correct' : ans.selectedAnswer ? '❌ Wrong' : '⏭ Skipped'}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">Your answer: {ans.selectedAnswer || 'Not answered'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default MyResults;