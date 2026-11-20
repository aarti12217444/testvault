import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import API from '../../api/axios';
import toast from 'react-hot-toast';


const QuestionBank = () => {
  const [questions, setQuestions] = useState([]);
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState({ questionText:'', options:{A:'',B:'',C:'',D:''}, correctAnswer:'A', subject:'', class:'', category:'Simple', difficulty:'Easy' });
  const [file, setFile] = useState(null);

  const [editingId, setEditingId] = useState(null);
  
    const [searchText, setSearchText] = useState('');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterClass, setFilterClass] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState('');
    const [selectedQuestions, setSelectedQuestions] = useState([]);


  const fetchQ = () => API.get('/questions').then(r => setQuestions(r.data));
  useEffect(() => { fetchQ(); }, []);

  
const handleEdit = (q) => {
  setEditingId(q._id);

  setForm({
    questionText: q.questionText || '',
    options: {
      A: q.options?.A || '',
      B: q.options?.B || '',
      C: q.options?.C || '',
      D: q.options?.D || ''
    },
    correctAnswer: q.correctAnswer || 'A',
    subject: q.subject || '',
    class: q.class || '',
    category: q.category || 'Simple',
    difficulty: q.difficulty || 'Easy'
  });

  setTab('add');
};


  
const handleAdd = async (e) => {
  e.preventDefault();

  try {
    if (editingId) {
      await API.put(`/questions/${editingId}`, form);
      toast.success('Question updated successfully!');
    } else {
      await API.post('/questions', form);
      toast.success('Question added successfully!');
    }

    await fetchQ();

    setEditingId(null);
    setForm({
      questionText: '',
      options: { A: '', B: '', C: '', D: '' },
      correctAnswer: 'A',
      subject: '',
      class: '',
      category: 'Simple',
      difficulty: 'Easy'
    });

    setTab('list');
  } catch (err) {
    console.error('Save question error:', err.response?.data || err.message);

    toast.error(
      err.response?.data?.message || 'Question save nahi ho paya.'
    );
  }
};
;

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
  
const handleDelete = async (questionId) => {
  if (!window.confirm('Are you sure you want to delete this question?')) {
    return;
  }

  try {
    console.log('Question ID:', questionId);

    const response = await API.delete(`/questions/${questionId}`);

    console.log('Delete response:', response.data);

    setQuestions(prev =>
      prev.filter(q => q._id !== questionId)
    );

    alert('Question deleted successfully!');
  } catch (error) {
    console.error('Delete error:', error.response?.status);
    console.error('Error details:', error.response?.data || error.message);

    alert(
      error.response?.data?.message ||
      `Delete failed: ${error.response?.status || error.message}`
    );
  }
};


const handleBulkDelete = async () => {
  if (selectedQuestions.length === 0) {
    toast.error('Please select questions first.');
    return;
  }

  const confirmed = window.confirm(
    `Are you sure you want to delete ${selectedQuestions.length} selected question(s)? This cannot be undone.`
  );

  if (!confirmed) return;

  try {
    const { data } = await API.delete('/questions/bulk-delete', {
      data: { questionIds: selectedQuestions }
    });

    setQuestions(prev =>
      prev.filter(q => !selectedQuestions.includes(q._id))
    );

    setSelectedQuestions([]);
    toast.success(data.message || 'Selected questions deleted.');
  } catch (error) {
    console.error(
      'Bulk delete error:',
      error.response?.data || error.message
    );

    toast.error(
      error.response?.data?.message || 'Bulk delete failed.'
    );
  }
};



const normalizeQuestion = (text = '') =>
  text.trim().replace(/\s+/g, ' ').toLowerCase();

const questionCounts = questions.reduce((counts, q) => {
  const normalized = normalizeQuestion(q.questionText);

  if (normalized) {
    counts[normalized] = (counts[normalized] || 0) + 1;
  }

  return counts;
}, {});

const isDuplicate = (question) =>
  (questionCounts[normalizeQuestion(question.questionText)] || 0) > 1;

  
const filteredQuestions = questions.filter(q => {
  const search = searchText.trim().toLowerCase();

  const matchesSearch =
    !search ||
    (q.questionText || '').toLowerCase().includes(search) ||
    (q.subject || '').toLowerCase().includes(search) ||
    (q.category || '').toLowerCase().includes(search);

  const matchesSubject =
    !filterSubject || q.subject === filterSubject;

  const matchesClass =
    !filterClass || q.class === filterClass;

  const matchesDifficulty =
    !filterDifficulty || q.difficulty === filterDifficulty;

  return (
    matchesSearch &&
    matchesSubject &&
    matchesClass &&
    matchesDifficulty
  );
});


  return (
    <div className="flex">
      <Layout />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Question Bank ({questions.length})</h2>
          <div className="flex gap-2">
            {[['list','📋 All'],['add','➕ Add'],['bulk','📤 Bulk Upload']].map(([t,l]) => (
              
            <button
              key={t}
              onClick={() => {
                if (t === 'add') {
                  setEditingId(null);
                  setForm({
                    questionText: '',
                    options: { A: '', B: '', C: '', D: '' },
                    correctAnswer: 'A',
                    subject: '',
                    class: '',
                    category: 'Simple',
                    difficulty: 'Easy'
                  });
                }

                setTab(t);
              }}
              className={`px-4 py-2 rounded-lg text-sm ${
                tab === t
                  ? 'bg-blue-600 text-white'
                  : 'border hover:bg-gray-50'
              }`}
            >
              {l}
            </button>
            ))}
          </div>
        </div>

        {tab === 'list' && (
          <>
          
      <div className="bg-white rounded-xl shadow p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search questions..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"
          />

          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Subjects</option>
            {[...new Set(questions.map(q => q.subject).filter(Boolean))].sort().map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>

          <select
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Classes</option>
            {[...new Set(questions.map(q => q.class).filter(Boolean))].sort().map(className => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>

          <select
            value={filterDifficulty}
            onChange={e => setFilterDifficulty(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        <div className="flex justify-between items-center mt-3">
          <p className="text-xs text-gray-500">
            {filteredQuestions.length} question(s) found
          </p>

          <button
            type="button"
            onClick={() => {
              setSearchText('');
              setFilterSubject('');
              setFilterClass('');
              setFilterDifficulty('');
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear filters
          </button>
          
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={selectedQuestions.length === 0}
            className="px-3 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Delete Selected ({selectedQuestions.length})
          </button>

        </div>
      </div>
     

          <div className="bg-white rounded-xl shadow overflow-hidden">
           <table className="w-full table-fixed text-sm">
              <thead className="bg-primary-900 text-white">
                {/* <tr>{['Question','Subject','Class','Category','Difficulty','Answer'].map(h => <th key={h} className="p-3 text-left">{h}</th>)}</tr> */}
                
              <tr>

                {/* Select All checkbox */}
                <th className="p-3 w-[4%] text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredQuestions.length > 0 &&
                      filteredQuestions.every(q => selectedQuestions.includes(q._id))
                    }
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedQuestions(prev => [
                          ...new Set([...prev, ...filteredQuestions.map(q => q._id)])
                        ]);
                      } else {
                        const visibleIds = filteredQuestions.map(q => q._id);
                        setSelectedQuestions(prev =>
                          prev.filter(id => !visibleIds.includes(id))
                        );
                      }
                    }}
                    aria-label="Select all visible questions"
                  />
                </th>
                <th className="p-3 text-left w-[32%]">Question</th>
                <th className="p-3 text-left w-[18%]">Subject</th>
                <th className="p-3 text-left w-[8%]">Class</th>
                <th className="p-3 text-left w-[13%]">Category</th>
                <th className="p-3 text-left w-[13%]">Difficulty</th>
                <th className="p-3 text-left w-[8%]">Answer</th>
                <th className="p-3 text-center w-[8%]">Action</th>
              </tr>

              </thead>
             
<tbody>
  {filteredQuestions.map((q, i) => (
    <tr
      key={q._id}
      className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
    >
      {/* Checkbox */}
      <td className="p-3 text-center">
        <input
          type="checkbox"
          checked={selectedQuestions.includes(q._id)}
          onChange={e => {
            setSelectedQuestions(prev =>
              e.target.checked
                ? [...new Set([...prev, q._id])]
                : prev.filter(id => id !== q._id)
            );
          }}
          aria-label={`Select ${q.questionText}`}
        />
      </td>

      {/* Question */}
      <td className="p-3 truncate" title={q.questionText}>
        {q.questionText}
      </td>

      {/* Subject */}
      <td className="p-3 truncate" title={q.subject}>
        {q.subject}
      </td>

      {/* Class */}
      <td className="p-3">{q.class}</td>

      {/* Category */}
      <td className="p-3">{q.category}</td>

      {/* Difficulty */}
      <td className="p-3">
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            q.difficulty === 'Easy'
              ? 'bg-green-100 text-green-700'
              : q.difficulty === 'Medium'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {q.difficulty}
        </span>
      </td>

      {/* Answer */}
      <td className="p-3 font-bold text-blue-600 text-center">
        {q.correctAnswer}
      </td>

      {/* Actions */}
      <td className="p-3 text-center whitespace-nowrap">
        {isDuplicate(q) && (
          <span
            title="Duplicate question"
            className="text-amber-600 mr-2"
          >
            ⧉
          </span>
        )}

        <button
          type="button"
          title="Edit question"
          className="text-blue-600 hover:text-blue-800 mr-2"
          onClick={() => handleEdit(q)}
        >
          ✏️
        </button>

        <button
          type="button"
          title="Delete question"
          className="text-red-600 hover:text-red-800 text-xl font-bold"
          onClick={() => handleDelete(q._id)}
        >
          ×
        </button>
      </td>
    </tr>
  ))}
</tbody>

            </table>
          </div>
           </>
        )}

        {tab === 'add' && (
          <div className="bg-white rounded-xl shadow p-6 max-w-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
            {editingId ? 'Edit Question' : 'Add New Question'}
          </h3>
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
              {/* <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm">Save Question</button> */}
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                {editingId ? 'Update Question' : 'Save Question'}
              </button>
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