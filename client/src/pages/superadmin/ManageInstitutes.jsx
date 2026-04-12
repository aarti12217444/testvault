import { useEffect, useState } from 'react';
// import Sidebar from '../../components/Sidebar';
import Layout from '../../components/Layout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const ManageInstitutes = () => {
  const [institutes, setInstitutes] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'school', email: '', phone: '', address: '' });
  const [loading, setLoading] = useState(false);

  const fetchInstitutes = () => API.get('/institutes').then(res => setInstitutes(res.data));
  useEffect(() => { fetchInstitutes(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/institutes', form);
      toast.success('✅ Institute created! Default password: Admin@123A');
      setShowForm(false);
      setForm({ name: '', type: 'school', email: '', phone: '', address: '' });
      fetchInstitutes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating institute');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex">
      <Layout />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">🏫 Manage Institutes</h2>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 font-medium">
            {showForm ? '✕ Cancel' : '+ Add Institute'}
          </button>
        </div>

        {/* Add Institute Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-6 border-2 border-blue-200">
            <h3 className="font-bold text-gray-700 mb-4">➕ New Institute</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Institute Name *</label>
                <input required
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="e.g. LPU, DAV School"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-600">Email *</label>
                <input required type="email"
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="admin@institute.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-600">Type *</label>
                <select className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="school">School</option>
                  <option value="college">College</option>
                  <option value="university">University</option>
                  <option value="company">Company</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">Phone</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-600">Address</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="City, State"
                  value={form.address}
                  onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="col-span-2 flex gap-3">
                <button type="submit" disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-60">
                  {loading ? 'Creating...' : '✅ Create Institute'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="border px-6 py-2 rounded-lg text-sm hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>

            <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-700">
                ⚠️ Default login password for institute admin will be: <strong>Admin@123A</strong>
              </p>
            </div>
          </div>
        )}

        {/* Institutes Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="p-5 border-b flex justify-between items-center">
            <h3 className="font-bold text-gray-800">All Institutes ({institutes.length})</h3>
          </div>
          {institutes.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">🏫</p>
              <p className="text-gray-400">No institutes yet. Add your first one!</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-blue-900 text-white">
                <tr>
                  {['#', 'Name', 'Type', 'Email', 'Phone', 'Status'].map(h => (
                    <th key={h} className="p-4 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {institutes.map((inst, i) => (
                  <tr key={inst._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-4 text-gray-400">{i + 1}</td>
                    <td className="p-4 font-medium text-gray-800">{inst.name}</td>
                    <td className="p-4 capitalize">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        inst.type === 'school' ? 'bg-green-100 text-green-700' :
                        inst.type === 'college' ? 'bg-blue-100 text-blue-700' :
                        inst.type === 'university' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {inst.type}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500">{inst.email}</td>
                    <td className="p-4 text-gray-500">{inst.phone || '—'}</td>
                    <td className="p-4">
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
                        ✅ Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};

export default ManageInstitutes;