import { useEffect, useState, useCallback } from 'react';
// import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [institute, setInstitute] = useState(null);
  const [stats, setStats] = useState({});
  const [editing, setEditing] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', rollNumber: '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await API.get('/profile');
      setProfile(data.user);
      setInstitute(data.institute);
      setForm({
        name: data.user.name || '',
        phone: data.user.phone || '',
        address: data.user.address || '',
        rollNumber: data.user.rollNumber || '',
      });
    } catch (err) {
      toast.error('Failed to load profile');
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      if (user?.role === 'student') {
        const [exams, results] = await Promise.all([
          API.get('/exams/my-exams'),
          API.get('/results/my-results'),
        ]);
        setStats({
          totalExams: exams.data.length,
          completed: results.data.length,
          pending: exams.data.length - results.data.length,
          avgScore: results.data.length > 0
            ? (results.data.reduce((a, r) => a + parseFloat(r.percentage), 0) / results.data.length).toFixed(1)
            : 0
        });
      } else if (user?.role === 'institute') {
        const [students, exams] = await Promise.all([
          API.get('/students'),
          API.get('/exams'),
        ]);
        setStats({ totalStudents: students.data.length, totalExams: exams.data.length });
      } else if (user?.role === 'superadmin') {
        const institutes = await API.get('/institutes');
        setStats({ totalInstitutes: institutes.data.length });
      }
    } catch {}
  }, [user?.role]);

  useEffect(() => {
    fetchProfile();
    fetchStats();
  }, [fetchProfile, fetchStats]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.put('/profile', form);
      toast.success('Profile updated!');
      setEditing(false);
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    setLoading(true);
    try {
      await API.put('/profile/change-password', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      toast.success('Password changed successfully!');
      setChangingPass(false);
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return (
    <div className="flex">
      <Layout />
      <main className="flex-1 p-8 flex items-center justify-center">
        <p className="text-gray-400">Loading profile...</p>
      </main>
    </div>
  );

  return (
    <div className="flex">
      <Layout />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">👤 My Profile</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Left — Avatar + Info */}
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4">
              {profile.name?.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-xl font-bold text-gray-800">{profile.name}</h3>
            <p className="text-gray-500 text-sm">{profile.email}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${
              profile.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
              profile.role === 'institute' ? 'bg-blue-100 text-blue-700' :
              'bg-green-100 text-green-700'
            }`}>
              {profile.role === 'superadmin' ? '👑 Super Admin' :
               profile.role === 'institute' ? '🏫 Institute Admin' : '👨‍🎓 Student'}
            </span>

            {institute && (
              <div className="mt-4 bg-blue-50 rounded-lg p-3 text-left">
                <p className="text-xs text-gray-500">Institute</p>
                <p className="font-medium text-blue-700">{institute.name}</p>
                <p className="text-xs text-gray-400 capitalize">{institute.type}</p>
              </div>
            )}

            {profile.rollNumber && (
              <div className="mt-3 bg-gray-50 rounded-lg p-3 text-left">
                <p className="text-xs text-gray-500">Roll Number</p>
                <p className="font-medium text-gray-700">{profile.rollNumber}</p>
              </div>
            )}

            {profile.phone && (
              <div className="mt-3 bg-gray-50 rounded-lg p-3 text-left">
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-medium text-gray-700">{profile.phone}</p>
              </div>
            )}

            {profile.address && (
              <div className="mt-3 bg-gray-50 rounded-lg p-3 text-left">
                <p className="text-xs text-gray-500">Address</p>
                <p className="font-medium text-gray-700">{profile.address}</p>
              </div>
            )}
          </div>

          {/* Right — Stats + Edit */}
          <div className="md:col-span-2 space-y-6">

            {/* Stats */}
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-bold text-gray-800 mb-4">📊 Statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {user?.role === 'student' && <>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.totalExams || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Total Exams</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.completed || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Completed</p>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Pending</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{stats.avgScore || 0}%</p>
                    <p className="text-xs text-gray-500 mt-1">Avg Score</p>
                  </div>
                </>}

                {user?.role === 'institute' && <>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">{stats.totalStudents || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Students</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{stats.totalExams || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Exams</p>
                  </div>
                </>}

                {user?.role === 'superadmin' && <>
                  <div className="bg-purple-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">{stats.totalInstitutes || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">Institutes</p>
                  </div>
                </>}
              </div>
            </div>

            {/* Edit Profile */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">✏️ Edit Profile</h3>
                <button onClick={() => setEditing(!editing)}
                  className="text-blue-600 text-sm hover:underline">
                  {editing ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {editing ? (
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600">Full Name</label>
                      <input className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                        value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Phone</label>
                      <input className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                        value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                        placeholder="9876543210" />
                    </div>
                    {user?.role === 'student' && (
                      <div>
                        <label className="text-sm text-gray-600">Roll Number</label>
                        <input className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                          value={form.rollNumber} onChange={e => setForm({ ...form, rollNumber: e.target.value })}
                          placeholder="e.g. 2024CS001" />
                      </div>
                    )}
                    <div>
                      <label className="text-sm text-gray-600">Address</label>
                      <input className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                        value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                        placeholder="City, State" />
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-60">
                    {loading ? 'Saving...' : '💾 Save Changes'}
                  </button>
                </form>
              ) : (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Name</p>
                    <p className="font-medium">{profile.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-medium">{profile.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Address</p>
                    <p className="font-medium">{profile.address || '—'}</p>
                  </div>
                  {user?.role === 'student' && (
                    <div>
                      <p className="text-gray-500">Roll Number</p>
                      <p className="font-medium">{profile.rollNumber || '—'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800">🔒 Change Password</h3>
                <button onClick={() => setChangingPass(!changingPass)}
                  className="text-blue-600 text-sm hover:underline">
                  {changingPass ? 'Cancel' : 'Change'}
                </button>
              </div>

              {changingPass && (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600">Current Password</label>
                    <input type="password" required
                      className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      value={passForm.currentPassword}
                      onChange={e => setPassForm({ ...passForm, currentPassword: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">New Password</label>
                    <input type="password" required
                      className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      value={passForm.newPassword}
                      onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Confirm New Password</label>
                    <input type="password" required
                      className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      value={passForm.confirmPassword}
                      onChange={e => setPassForm({ ...passForm, confirmPassword: e.target.value })} />
                    {passForm.confirmPassword && passForm.newPassword !== passForm.confirmPassword && (
                      <p className="text-xs text-red-500 mt-1">❌ Passwords do not match</p>
                    )}
                    {passForm.confirmPassword && passForm.newPassword === passForm.confirmPassword && (
                      <p className="text-xs text-green-500 mt-1">✅ Passwords match</p>
                    )}
                  </div>
                  <button type="submit" disabled={loading}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 text-sm disabled:opacity-60">
                    {loading ? 'Changing...' : '🔒 Change Password'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
// node -e "
// const mongoose = require('mongoose');
// require('dotenv').config();
// mongoose.connect(process.env.MONGO_URI).then(async () => {
//   const db = mongoose.connection.db;
//   await db.collection('users').updateMany(
//     { phone: { \$exists: false } },
//     { \$set: { phone: '', address: '', rollNumber: '', profilePicture: '' } }
//   );
//   console.log('All users updated!');
//   process.exit();
// });
// "
