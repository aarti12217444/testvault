import { useEffect, useState } from 'react';
// import Sidebar from '../../components/Sidebar';
import Layout from '../../components/Layout';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const InstituteDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ students: 0, questions: 0, exams: 0, results: 0 });
  const [inviteCode, setInviteCode] = useState(null);
  const [loadingCode, setLoadingCode] = useState(false);

  useEffect(() => {
    Promise.all([
      API.get('/students'),
      API.get('/questions'),
      API.get('/exams'),
      API.get('/results'),
    ]).then(([s, q, e, r]) => {
      setStats({ students: s.data.length, questions: q.data.length, exams: e.data.length, results: r.data.length });
    });
  }, []);

  const generateInviteCode = async () => {
    setLoadingCode(true);
    try {
      const { data } = await API.post('/institutes/generate-invite');
      setInviteCode(data.inviteCode);
      toast.success('Invite code sent to your email! 📧');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error generating code');
    } finally {
      setLoadingCode(false);
    }
  };

  const cards = [
    { label: 'Total Students', value: stats.students, icon: '👨‍🎓', color: 'bg-blue-500' },
    { label: 'Questions', value: stats.questions, icon: '📝', color: 'bg-purple-500' },
    { label: 'Exams Created', value: stats.exams, icon: '📋', color: 'bg-green-500' },
    { label: 'Results', value: stats.results, icon: '📊', color: 'bg-orange-500' },
  ];

  return (
    <div className="flex">
      <Layout />
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome, {user?.name} 👋</h2>
        <p className="text-gray-500 mb-6">Institute Dashboard</p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {cards.map((c, i) => (
            <div key={i} className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
              <div className={`${c.color} text-white text-2xl w-12 h-12 rounded-xl flex items-center justify-center`}>
                {c.icon}
              </div>
              <div>
                <p className="text-gray-500 text-sm">{c.label}</p>
                <p className="text-2xl font-bold">{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Invite Code Section */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-2">🔑 Student Invite Code</h3>
          <p className="text-gray-500 text-sm mb-4">
            Generate a code and share with students — they will use it during registration to join your institute.
            Code will also be sent to your registered email.
          </p>

          {inviteCode && (
            <div className="bg-blue-50 border-2 border-dashed border-blue-400 rounded-xl p-6 text-center mb-4">
              <p className="text-gray-500 text-sm mb-2">Your Invite Code</p>
              <h2 className="text-4xl font-bold text-blue-600 tracking-widest">{inviteCode}</h2>
              <p className="text-xs text-red-400 mt-2">⚠️ Valid for 7 days</p>
              <button
                onClick={() => { navigator.clipboard.writeText(inviteCode); toast.success('Code copied!'); }}
                className="mt-3 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-lg text-sm hover:bg-blue-200"
              >
                📋 Copy Code
              </button>
            </div>
          )}

          <button
            onClick={generateInviteCode}
            disabled={loadingCode}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-60 font-medium"
          >
            {loadingCode ? 'Generating...' : '🔑 Generate New Invite Code'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default InstituteDashboard;