import { useEffect, useState } from 'react';
// import Sidebar from '../../components/Sidebar';
import Layout from '../../components/Layout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const fetchStudents = () => API.get('/students').then(r => setStudents(r.data));
  useEffect(() => { fetchStudents(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/students', form);
      toast.success('Student created!');
      setShowForm(false);
      setForm({ name: '', email: '', password: '' });
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  return (
    <div className="flex">
      <Layout />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Manage Students</h2>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700">
            + Add Student
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <form onSubmit={handleSubmit} className="flex gap-4 flex-wrap">
              {[['name','Name','text'],['email','Email','email'],['password','Password','password']].map(([f,l,t]) => (
                <div key={f}>
                  <label className="text-sm text-gray-600">{l}</label>
                  <input type={t} required
                    className="block border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={form[f]} onChange={e => setForm({ ...form, [f]: e.target.value })}
                  />
                </div>
              ))}
              <div className="flex items-end gap-2">
                <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm">Add</button>
                <button type="button" onClick={() => setShowForm(false)} className="border px-5 py-2 rounded-lg text-sm">Cancel</button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-primary-900 text-white">
              <tr>{['Name','Email','Role','Created'].map(h => <th key={h} className="p-4 text-left">{h}</th>)}</tr>
            </thead>
            <tbody>
              {students.map((s, i) => (
                <tr key={s._id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="p-4 font-medium">{s.name}</td>
                  <td className="p-4 text-gray-500">{s.email}</td>
                  <td className="p-4 capitalize">{s.role}</td>
                  <td className="p-4 text-gray-400">{new Date(s.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default ManageStudents;