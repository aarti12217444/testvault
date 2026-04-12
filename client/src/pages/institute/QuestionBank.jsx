import { useEffect, useState } from 'react';
// import Sidebar from '../../components/Sidebar';
import Layout from '../../components/Layout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState({ questionText:'', options:{A:'',B:'',C:'',D:''}, correctAnswer:'A', subject:'', class:'', category:'Simple', difficulty:'Easy' });
  const [file, setFile] = useState(null);

  const fetchQ = () => API.get('/questions').then(r => setQuestions(r.data));
  useEffect(() => { fetchQ(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await API.post('/questions', form);
      toast.success('Question added!');
      fetchQ();
      setTab('list');
    } catch (err) { toast.error('Error adding question'); }
  };

  const handleBulk = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Select a file first');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await API.post('/questions/bulk-upload', fd);
      toast.success(data.message);
      fetchQ();
      setTab('list');
    } catch (err) { toast.error('Upload failed'); }
  };

  return (
    <div className="flex">
      <Layout />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Question Bank ({questions.length})</h2>
          <div className="flex gap-2">
            {[['list','📋 All'],['add','➕ Add'],['bulk','📤 Bulk Upload']].map(([t,l]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm ${tab===t ? 'bg-blue-600 text-white' : 'border hover:bg-gray-50'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {tab === 'list' && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-primary-900 text-white">
                <tr>{['Question','Subject','Class','Category','Difficulty','Answer'].map(h => <th key={h} className="p-3 text-left">{h}</th>)}</tr>
              </thead>
              <tbody>
                {questions.map((q, i) => (
                  <tr key={q._id} className={i%2===0?'bg-white':'bg-gray-50'}>
                    <td className="p-3 max-w-xs truncate">{q.questionText}</td>
                    <td className="p-3">{q.subject}</td>
                    <td className="p-3">{q.class}</td>
                    <td className="p-3">{q.category}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${q.difficulty==='Easy'?'bg-green-100 text-green-700':q.difficulty==='Medium'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-blue-600">{q.correctAnswer}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'add' && (
          <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Question</label>
                <textarea required rows={3} className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.questionText} onChange={e => setForm({...form, questionText: e.target.value})} />
              </div>
              {['A','B','C','D'].map(opt => (
                <div key={opt}>
                  <label className="text-sm text-gray-600">Option {opt}</label>
                  <input required className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                    value={form.options[opt]} onChange={e => setForm({...form, options:{...form.options, [opt]: e.target.value}})} />
                </div>
              ))}
              <div className="grid grid-cols-3 gap-4">
                {[['correctAnswer','Correct Ans',['A','B','C','D']],['category','Category',['Simple','NEET','JEE','General']],['difficulty','Difficulty',['Easy','Medium','Hard']]].map(([f,l,opts]) => (
                  <div key={f}>
                    <label className="text-sm text-gray-600">{l}</label>
                    <select className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                      value={form[f]} onChange={e => setForm({...form, [f]: e.target.value})}>
                      {opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[['subject','Subject (e.g. Physics)'],['class','Class (e.g. 10th)']].map(([f,l]) => (
                  <div key={f}>
                    <label className="text-sm text-gray-600">{l}</label>
                    <input required className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      value={form[f]} onChange={e => setForm({...form, [f]: e.target.value})} />
                  </div>
                ))}
              </div>
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm">Save Question</button>
            </form>
          </div>
        )}

        {tab === 'bulk' && (
          <div className="bg-white rounded-xl shadow p-6 max-w-md">
            <p className="text-gray-600 text-sm mb-4">Upload the Excel file (.xlsx) with columns: Question, Option_A, Option_B, Option_C, Option_D, Correct_Answer, Subject, Class, Category, Difficulty</p>
            <form onSubmit={handleBulk} className="space-y-4">
              <input type="file" accept=".xlsx,.csv" onChange={e => setFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700" />
              <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm">Upload</button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default QuestionBank;