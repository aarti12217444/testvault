import { useEffect, useState } from 'react';
// import Sidebar from '../../components/Sidebar';
import Layout from '../../components/Layout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const SuperAdminProfile = () => {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({ institutes: 0, students: 0 });
  const [editing, setEditing] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', profilePicture: '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
    Promise.all([
      API.get('/institutes'),
      API.get('/users/students'),
    ]).then(([inst, stud]) => {
      setStats({ institutes: inst.data.length, students: stud.data.length });
    }).catch(() => {});
  }, []);

  const fetchProfile = async () => {
    const { data } = await API.get('/profile');
    setProfile(data.user);
    setForm({
      name: data.user.name || '',
      phone: data.user.phone || '',
      profilePicture: data.user.profilePicture || '',
    });
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await API.put('/profile', form);
      toast.success('Profile updated!');
      setEditing(false);
      fetchProfile();
    } catch {
      toast.error('Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
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
      toast.success('Password changed!');
      setShowPassModal(false);
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm(f => ({ ...f, profilePicture: reader.result }));
    reader.readAsDataURL(file);
  };

  if (!profile) return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-gray-400">Loading...</p>
    </div>
  );

  return (
    <div className="flex">
      <Layout />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">👑 SuperAdmin Profile</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Left Card */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow p-6 text-center">
              <div className="relative inline-block mb-4">
                {form.profilePicture ? (
                  <img src={form.profilePicture} alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-yellow-100 mx-auto" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-yellow-500 flex items-center justify-center mx-auto border-4 border-yellow-100">
                    <span className="text-white text-3xl font-bold">
                      {profile.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {editing && (
                  <label className="absolute bottom-0 right-0 bg-yellow-500 text-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer">
                    📷
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </div>

              <h3 className="font-bold text-xl text-gray-800">{profile.name}</h3>
              <p className="text-gray-500 text-sm mt-1">{profile.email}</p>
              <span className="inline-block mt-2 bg-yellow-100 text-yellow-700 text-xs px-3 py-1 rounded-full font-medium">
                👑 Super Admin
              </span>

              <div className="mt-4 space-y-2">
                <button onClick={() => setEditing(!editing)}
                  className="w-full bg-yellow-500 text-white py-2 rounded-lg text-sm hover:bg-yellow-600">
                  ✏️ {editing ? 'Cancel Edit' : 'Edit Profile'}
                </button>
                <button onClick={() => setShowPassModal(true)}
                  className="w-full border border-gray-200 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50">
                  🔒 Change Password
                </button>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="md:col-span-2 space-y-6">

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow p-6 text-center">
                <p className="text-4xl font-bold text-blue-600">{stats.institutes}</p>
                <p className="text-sm text-gray-500 mt-1">Total Institutes</p>
              </div>
              <div className="bg-white rounded-xl shadow p-6 text-center">
                <p className="text-4xl font-bold text-green-600">{stats.students}</p>
                <p className="text-sm text-gray-500 mt-1">Total Students</p>
              </div>
            </div>

            {/* Edit Form */}
            {editing && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="font-bold text-gray-700 mb-4">✏️ Edit Profile</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Full Name</label>
                    <input className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Phone</label>
                    <input className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                      value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <button onClick={handleUpdate} disabled={loading}
                  className="mt-4 bg-yellow-500 text-white px-6 py-2 rounded-lg text-sm hover:bg-yellow-600 disabled:opacity-60">
                  {loading ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Change Password Modal */}
        {showPassModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="font-bold text-gray-800 text-lg mb-4">🔒 Change Password</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Current Password</label>
                  <input type="password" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                    value={passForm.currentPassword}
                    onChange={e => setPassForm({ ...passForm, currentPassword: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">New Password</label>
                  <input type="password" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                    value={passForm.newPassword}
                    onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Confirm Password</label>
                  <input type="password" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                    value={passForm.confirmPassword}
                    onChange={e => setPassForm({ ...passForm, confirmPassword: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={handleChangePassword} disabled={loading}
                  className="flex-1 bg-yellow-500 text-white py-2 rounded-lg text-sm hover:bg-yellow-600 disabled:opacity-60">
                  {loading ? 'Changing...' : '🔒 Change Password'}
                </button>
                <button onClick={() => setShowPassModal(false)}
                  className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SuperAdminProfile;