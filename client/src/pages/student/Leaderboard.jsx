import { useEffect, useState } from 'react';
// import Sidebar from '../../components/Sidebar';
import Layout from '../../components/Layout';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const Leaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRank, setMyRank] = useState(null);

  useEffect(() => {
    API.get('/leaderboard').then(r => {
      setLeaderboard(r.data);
      const me = r.data.find(s => s._id === user?._id);
      if (me) setMyRank(me);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const getRankEmoji = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankBg = (rank) => {
    if (rank === 1) return 'bg-yellow-50 border-yellow-300';
    if (rank === 2) return 'bg-gray-50 border-gray-300';
    if (rank === 3) return 'bg-orange-50 border-orange-300';
    return 'bg-white border-transparent';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-500';
  };

  if (loading) return (
    <div className="flex">
      <Layout />
      <main className="flex-1 p-8 flex items-center justify-center">
        <p className="text-gray-400 text-lg">Loading leaderboard... 🏆</p>
      </main>
    </div>
  );

  return (
    <div className="flex">
      <Layout />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">🏆 Leaderboard</h2>
        <p className="text-gray-500 text-sm mb-6">Your institute ka ranking — sabse zyada avg score wala #1!</p>

        {/* My Rank Card */}
        {myRank && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-5 mb-6 text-white shadow-lg">
            <p className="text-blue-200 text-sm mb-1">Your Position</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-2xl font-black">
                  {myRank.rank <= 3 ? getRankEmoji(myRank.rank) : `#${myRank.rank}`}
                </div>
                <div>
                  <p className="font-bold text-xl">{myRank.name}</p>
                  <p className="text-blue-200 text-sm">Rank {myRank.rank} out of {leaderboard.length}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black">{myRank.avgScore}%</p>
                <p className="text-blue-200 text-xs">Avg Score</p>
              </div>
            </div>

            {/* My Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-white bg-opacity-10 rounded-xl p-3 text-center">
                <p className="text-xl font-bold">{myRank.totalExams}</p>
                <p className="text-xs text-blue-200">Exams Given</p>
              </div>
              <div className="bg-white bg-opacity-10 rounded-xl p-3 text-center">
                <p className="text-xl font-bold">{myRank.avgScore}%</p>
                <p className="text-xs text-blue-200">Avg Score</p>
              </div>
              <div className="bg-white bg-opacity-10 rounded-xl p-3 text-center">
                <p className="text-xl font-bold">{myRank.bestScore}%</p>
                <p className="text-xs text-blue-200">Best Score</p>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h3 className="font-bold text-gray-800 mb-4 text-center">🎖️ Top 3</h3>
            <div className="flex items-end justify-center gap-4">

              {/* 2nd */}
              <div className="text-center flex-1">
                <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-2">
                  {leaderboard[1].profilePicture ? (
                    <img src={leaderboard[1].profilePicture} className="w-14 h-14 rounded-full object-cover" alt="" />
                  ) : (
                    leaderboard[1].name?.charAt(0).toUpperCase()
                  )}
                </div>
                <p className="text-2xl">🥈</p>
                <p className="font-semibold text-gray-800 text-sm truncate">{leaderboard[1].name}</p>
                <p className="text-gray-500 text-xs">{leaderboard[1].avgScore}%</p>
                <div className="bg-gray-200 rounded-t-lg h-16 mt-2"></div>
              </div>

              {/* 1st */}
              <div className="text-center flex-1">
                <div className="w-16 h-16 bg-yellow-200 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-2 border-4 border-yellow-400">
                  {leaderboard[0].profilePicture ? (
                    <img src={leaderboard[0].profilePicture} className="w-16 h-16 rounded-full object-cover" alt="" />
                  ) : (
                    leaderboard[0].name?.charAt(0).toUpperCase()
                  )}
                </div>
                <p className="text-3xl">🥇</p>
                <p className="font-bold text-gray-800 text-sm truncate">{leaderboard[0].name}</p>
                <p className="text-yellow-600 font-bold text-sm">{leaderboard[0].avgScore}%</p>
                <div className="bg-yellow-300 rounded-t-lg h-24 mt-2"></div>
              </div>

              {/* 3rd */}
              <div className="text-center flex-1">
                <div className="w-14 h-14 bg-orange-200 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-2">
                  {leaderboard[2].profilePicture ? (
                    <img src={leaderboard[2].profilePicture} className="w-14 h-14 rounded-full object-cover" alt="" />
                  ) : (
                    leaderboard[2].name?.charAt(0).toUpperCase()
                  )}
                </div>
                <p className="text-2xl">🥉</p>
                <p className="font-semibold text-gray-800 text-sm truncate">{leaderboard[2].name}</p>
                <p className="text-orange-500 text-xs">{leaderboard[2].avgScore}%</p>
                <div className="bg-orange-300 rounded-t-lg h-10 mt-2"></div>
              </div>
            </div>
          </div>
        )}

        {/* Full Leaderboard Table */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <div className="p-5 border-b">
            <h3 className="font-bold text-gray-800">📋 Full Rankings</h3>
          </div>
          <div className="divide-y">
            {leaderboard.map((student) => (
              <div key={student._id}
                className={`flex items-center gap-4 px-5 py-4 border-2 transition hover:bg-gray-50 ${
                  student._id === user?._id ? 'bg-blue-50 border-blue-300' : getRankBg(student.rank)
                }`}>

                {/* Rank */}
                <div className="w-10 text-center">
                  <span className="text-xl font-black">
                    {getRankEmoji(student.rank)}
                  </span>
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
                  {student.profilePicture ? (
                    <img src={student.profilePicture} className="w-10 h-10 object-cover" alt="" />
                  ) : (
                    student.name?.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${
                    student._id === user?._id ? 'text-blue-700' : 'text-gray-800'
                  }`}>
                    {student.name}
                    {student._id === user?._id && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">You</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">{student.totalExams} exams given</p>
                </div>

                {/* Stats */}
                <div className="flex gap-6 text-right">
                  <div>
                    <p className={`font-bold text-lg ${getScoreColor(student.avgScore)}`}>
                      {student.avgScore}%
                    </p>
                    <p className="text-xs text-gray-400">Avg</p>
                  </div>
                  <div>
                    <p className={`font-bold text-lg ${getScoreColor(student.bestScore)}`}>
                      {student.bestScore}%
                    </p>
                    <p className="text-xs text-gray-400">Best</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {leaderboard.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-5xl mb-3">🏆</p>
              <p className="text-gray-500">Koi results nahi hain abhi. Pehle exam do!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;