import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// import Sidebar from '../../components/Sidebar';
import Layout from '../../components/Layout';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/exams/my-exams').then(r => setExams(r.data));
    API.get('/results/my-results').then(r => setResults(r.data));
    // Every minute update current time for live status
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isCompleted = (examId) =>
    results.some(r => r.examId?._id === examId || r.examId === examId);

  const getResult = (examId) =>
    results.find(r => r.examId?._id === examId || r.examId === examId);

  // Exam ka live status
  const getExamStatus = (exam) => {
    if (isCompleted(exam._id)) return 'completed';
    if (exam.startTime && now < new Date(exam.startTime)) return 'upcoming';
    if (exam.endTime && now > new Date(exam.endTime)) return 'expired';
    return 'active';
  };

  const formatDateTime = (dt) => {
    if (!dt) return '';
    return new Date(dt).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  // Time remaining countdown
  const getTimeRemaining = (startTime) => {
    const diff = new Date(startTime) - now;
    if (diff <= 0) return '';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins} mins remaining`;
  };

  const upcoming = exams.filter(e => getExamStatus(e) === 'upcoming');
  const active = exams.filter(e => getExamStatus(e) === 'active');
  const completed = exams.filter(e => getExamStatus(e) === 'completed');
  const expired = exams.filter(e => getExamStatus(e) === 'expired');

  const ExamCard = ({ exam }) => {
    const status = getExamStatus(exam);
    const result = getResult(exam._id);

    return (
      <div className={`bg-white rounded-xl shadow p-6 hover:shadow-md transition border-2 ${
        status === 'completed' ? 'border-green-300' :
        status === 'upcoming' ? 'border-blue-300' :
        status === 'active' ? 'border-yellow-300' :
        'border-gray-200'
      }`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-gray-800 text-base flex-1 pr-2">{exam.title}</h3>
          {status === 'completed' && (
            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap">✅ Completed</span>
          )}
          {status === 'upcoming' && (
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap">🔵 Upcoming</span>
          )}
          {status === 'active' && (
            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap">⚡ Live Now</span>
          )}
          {status === 'expired' && (
            <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap">🔴 Expired</span>
          )}
        </div>

        <p className="text-gray-500 text-sm">{exam.subject} {exam.class && `• ${exam.class}`}</p>

        <div className="flex justify-between items-center mt-3">
          <span className="text-sm text-blue-600">⏱ {exam.duration} mins</span>
          <span className="text-sm text-green-600">📝 {exam.questions?.length || 0} Qs</span>
          <span className="text-sm text-purple-600">🎯 {exam.totalMarks} marks</span>
        </div>

        {/* Schedule Info for Upcoming */}
        {status === 'upcoming' && exam.startTime && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700 font-medium">📅 Scheduled</p>
            <p className="text-sm text-blue-800 font-bold mt-1">
              {formatDateTime(exam.startTime)}
            </p>
            {exam.endTime && (
              <p className="text-xs text-blue-600 mt-0.5">
                Ends: {formatDateTime(exam.endTime)}
              </p>
            )}
            <p className="text-xs text-orange-600 font-medium mt-1">
              ⏳ {getTimeRemaining(exam.startTime)}
            </p>
          </div>
        )}

        {/* Active Exam — show end time if set */}
        {status === 'active' && exam.endTime && (
          <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
            <p className="text-xs text-yellow-700">⚠️ Exam ends at: <strong>{formatDateTime(exam.endTime)}</strong></p>
          </div>
        )}

        {/* Result if completed */}
        {status === 'completed' && result && (
          <div className="mt-3 bg-green-50 rounded-lg p-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Score:</span>
              <span className="font-bold text-green-700">{result.score}/{result.totalMarks}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${result.percentage >= 60 ? 'bg-green-500' : result.percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${result.percentage}%` }}
              />
            </div>
            <p className={`text-sm font-bold mt-1 ${result.percentage >= 60 ? 'text-green-600' : result.percentage >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
              {result.percentage}%
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-4">
          {status === 'completed' && (
            <button disabled className="w-full bg-gray-100 text-gray-400 py-2 rounded-lg text-sm font-medium cursor-not-allowed">
              ✅ Already Attempted
            </button>
          )}
          {status === 'upcoming' && (
            <button disabled className="w-full bg-blue-50 text-blue-400 py-2 rounded-lg text-sm font-medium cursor-not-allowed">
              🔒 Not Started Yet
            </button>
          )}
          {status === 'active' && (
            <button
              onClick={() => navigate(`/student/exam/${exam._id}`)}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
              Start Exam →
            </button>
          )}
          {status === 'expired' && (
            <button disabled className="w-full bg-red-50 text-red-400 py-2 rounded-lg text-sm font-medium cursor-not-allowed">
              ⏱ Exam Ended
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex">
      <Layout />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">Hello, {user?.name} 👋</h2>
        <p className="text-gray-500 mb-8">Your exam dashboard</p>

        {exams.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-lg">No exams assigned yet.</p>
          </div>
        )}

        {/* Active Exams */}
        {active.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">⚡ Live Exams ({active.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {active.map(exam => <ExamCard key={exam._id} exam={exam} />)}
            </div>
          </div>
        )}

        {/* Upcoming Exams */}
        {upcoming.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">🔵 Upcoming Exams ({upcoming.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {upcoming.map(exam => <ExamCard key={exam._id} exam={exam} />)}
            </div>
          </div>
        )}

        {/* Completed Exams */}
        {completed.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">✅ Completed Exams ({completed.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {completed.map(exam => <ExamCard key={exam._id} exam={exam} />)}
            </div>
          </div>
        )}

        {/* Expired Exams */}
        {expired.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">🔴 Expired Exams ({expired.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {expired.map(exam => <ExamCard key={exam._id} exam={exam} />)}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;