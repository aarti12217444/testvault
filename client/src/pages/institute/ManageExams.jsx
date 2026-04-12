import { useEffect, useState } from 'react';
// import Sidebar from '../../components/Sidebar';
import Layout from '../../components/Layout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

// ✅ Predefined Section → SubSection map
const SECTION_MAP = {
  'Cloud Computing': [],
  'Cyber Security': [],
  'Full Stack': ['HTML', 'CSS', 'JavaScript', 'React', 'TypeScript', 'Node.js', 'Express', 'Angular', 'MongoDB'],
  'Programming': ['C', 'C++', 'Python', 'Java', 'Ruby', 'Go', 'C#'],
  'DSA': ['Arrays', 'Linked Lists', 'Trees', 'Graphs', 'Sorting', 'Dynamic Programming', 'Stacks & Queues', 'Hashing'],
  'Logical Reasoning': [],
  'Aptitude': [],
  'Verbal': [],
};

const ALL_SECTIONS = Object.keys(SECTION_MAP);

const ManageExams = () => {
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [students, setStudents] = useState([]);
  const [results, setResults] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [sectionFilter, setSectionFilter] = useState('');
  const [subSectionFilter, setSubSectionFilter] = useState('');
  const [form, setForm] = useState({
    title: '', subject: '', class: '', description: '',
    duration: 30, totalMarks: 100,
    questions: [], assignedTo: [],
    startTime: '', endTime: '',
    shuffleQuestions: false, shuffleOptions: false,
    cameraEnabled: false, micEnabled: false,
  });

  const fetchAll = () => {
    API.get('/exams').then(r => setExams(r.data));
    API.get('/questions').then(r => setQuestions(r.data));
    API.get('/students').then(r => setStudents(r.data));
    API.get('/results').then(r => setResults(r.data));
  };

  useEffect(() => { fetchAll(); }, []);

  const [declaringExam, setDeclaringExam] = useState(null);
  const [declareTime, setDeclareTime] = useState('');

  const handleDeclareResult = async (examId, scheduled = false) => {
    try {
      const payload = scheduled && declareTime
        ? { resultDeclareAt: new Date(declareTime).toISOString() }
        : {};
      await API.post(`/exams/${examId}/declare-result`, payload);
      toast.success(scheduled ? '⏰ Result scheduled!' : '✅ Result declared!');
      setDeclaringExam(null);
      setDeclareTime('');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error declaring result');
    }
  };

  // SubSections for selected section
  const subSections = sectionFilter ? (SECTION_MAP[sectionFilter] || []) : [];

  // Questions filter — section aur subsection se
  const filteredQuestions = questions.filter(q => {
    if (!sectionFilter) return true;

    // Section match — kisi bhi field mein ho
    const qSection = (q.section || '').toLowerCase().trim();
    const qSubject = (q.subject || '').toLowerCase().trim();
    const qSubSection = (q.subSection || '').toLowerCase().trim();
    const selectedSection = sectionFilter.toLowerCase().trim();
    const selectedSubSection = (subSectionFilter || '').toLowerCase().trim();

    const sectionMatch = qSection === selectedSection || qSubject === selectedSection;
    if (!sectionMatch) return false;

    // SubSection filter
    if (selectedSubSection) {
      return qSubSection === selectedSubSection || qSubject === selectedSubSection;
    }

    return true;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        startTime: form.startTime ? new Date(form.startTime).toISOString() : null,
        endTime: form.endTime ? new Date(form.endTime).toISOString() : null,
      };
      await API.post('/exams', payload);
      toast.success('Exam created!');
      setShowForm(false);
      setForm({
        title: '', subject: '', class: '', description: '',
        duration: 30, totalMarks: 100,
        questions: [], assignedTo: [],
        startTime: '', endTime: '',
        shuffleQuestions: false, shuffleOptions: false,
        cameraEnabled: false, micEnabled: false,
      });
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating exam');
    }
  };

  const toggleQuestion = (id) => {
    setForm(f => ({
      ...f,
      questions: f.questions.includes(id) ? f.questions.filter(q => q !== id) : [...f.questions, id]
    }));
  };

  const toggleStudent = (id) => {
    setForm(f => ({
      ...f,
      assignedTo: f.assignedTo.includes(id) ? f.assignedTo.filter(s => s !== id) : [...f.assignedTo, id]
    }));
  };

  // Exam status based on startTime/endTime
  const getExamStatus = (exam) => {
    const now = new Date();
    if (!exam.isActive) return { label: '⚫ Inactive', style: 'bg-gray-100 text-gray-600' };
    if (exam.startTime && now < new Date(exam.startTime)) return { label: '🔵 Upcoming', style: 'bg-blue-100 text-blue-700' };
    if (exam.endTime && now > new Date(exam.endTime)) return { label: '🔴 Expired', style: 'bg-red-100 text-red-600' };
    return { label: '🟢 Active', style: 'bg-green-100 text-green-700' };
  };

  const formatDateTime = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  const attempted = (exam) => results.filter(r =>
    r.examId === exam._id || r.examId?._id === exam._id
  ).length;

  return (
    <div className="flex">
      <Layout />
      <main className="flex-1 p-8 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Manage Exams</h2>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700">
            {showForm ? '✕ Cancel' : '+ Create Exam'}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <h3 className="font-semibold text-gray-700 mb-5 text-lg">📝 New Exam</h3>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Basic Info */}
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase mb-3">Basic Info</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-sm text-gray-600">Exam Title *</label>
                    <input required className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Full Stack Mid Term Exam" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Subject</label>
                    <input className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                      placeholder="e.g. Full Stack" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Class / Batch</label>
                    <input className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      value={form.class} onChange={e => setForm({ ...form, class: e.target.value })}
                      placeholder="e.g. Batch A 2024" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Duration (minutes) *</label>
                    <input type="number" required className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Total Marks *</label>
                    <input type="number" required className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      value={form.totalMarks} onChange={e => setForm({ ...form, totalMarks: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm text-gray-600">Description</label>
                    <textarea className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Optional exam description..." />
                  </div>
                </div>
              </div>

              {/* Schedule */}
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase mb-3">📅 Schedule (Optional)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">Start Date & Time</label>
                    <input type="datetime-local" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
                    <p className="text-xs text-gray-400 mt-1">Leave empty for immediate activation</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">End Date & Time</label>
                    <input type="datetime-local" className="w-full border rounded-lg px-3 py-2 mt-1 text-sm outline-none focus:ring-2 focus:ring-blue-400"
                      value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
                    <p className="text-xs text-gray-400 mt-1">Leave empty for no expiry</p>
                  </div>
                </div>
                {form.startTime && form.endTime && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                    🕐 Exam will be active from <strong>{formatDateTime(form.startTime)}</strong> to <strong>{formatDateTime(form.endTime)}</strong>
                  </div>
                )}
              </div>

              {/* Proctoring Settings */}
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase mb-3">⚙️ Exam Settings</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'shuffleQuestions', label: '🔀 Shuffle Questions', desc: 'Randomize question order' },
                    { key: 'shuffleOptions', label: '🔀 Shuffle Options', desc: 'Randomize answer options' },
                    { key: 'cameraEnabled', label: '📷 Enable Camera', desc: 'Camera proctoring during exam' },
                    { key: 'micEnabled', label: '🎤 Enable Microphone', desc: 'Mic monitoring during exam' },
                  ].map(setting => (
                    <label key={setting.key} className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition ${form[setting.key] ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div>
                        <p className="text-sm font-medium text-gray-700">{setting.label}</p>
                        <p className="text-xs text-gray-400">{setting.desc}</p>
                      </div>
                      <div className={`w-12 h-6 rounded-full transition-colors ${form[setting.key] ? 'bg-blue-500' : 'bg-gray-300'}`}
                        onClick={() => setForm(f => ({ ...f, [setting.key]: !f[setting.key] }))}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${form[setting.key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Select Questions with Section Filter */}
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase mb-3">❓ Select Questions ({form.questions.length} selected)</p>
                <div className="flex gap-3 mb-3">
                  {/* Section Dropdown */}
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Section</label>
                    <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                      value={sectionFilter}
                      onChange={e => { setSectionFilter(e.target.value); setSubSectionFilter(''); }}>
                      <option value="">— Select Section —</option>
                      {ALL_SECTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* SubSection Dropdown — sirf tab dikhao jab section selected ho aur uske subsections hon */}
                  {sectionFilter && subSections.length > 0 && (
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 mb-1 block">Sub-Section</label>
                      <select className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                        value={subSectionFilter}
                        onChange={e => setSubSectionFilter(e.target.value)}>
                        <option value="">— All Sub-Sections —</option>
                        {subSections.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Filter summary */}
                {sectionFilter && (
                  <div className="mb-2 flex items-center gap-2 flex-wrap">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">📂 {sectionFilter}</span>
                    {subSectionFilter && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">📌 {subSectionFilter}</span>}
                    <span className="text-xs text-gray-400">{filteredQuestions.length} questions found</span>
                    <button type="button" onClick={() => { setSectionFilter(''); setSubSectionFilter(''); }}
                      className="text-xs text-red-400 hover:text-red-600 underline">Clear filter</button>
                  </div>
                )}
                <div className="border rounded-lg max-h-52 overflow-y-auto divide-y">
                  {filteredQuestions.length === 0
                    ? <p className="p-3 text-sm text-gray-400">No questions found for this filter.</p>
                    : filteredQuestions.map(q => (
                      <label key={q._id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={form.questions.includes(q._id)}
                          onChange={() => toggleQuestion(q._id)} />
                        <span className="text-sm text-gray-700 flex-1 truncate">{q.questionText}</span>
                        <span className="text-xs text-purple-500 bg-purple-50 px-2 py-0.5 rounded">{q.section}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${q.difficulty === 'Easy' ? 'text-green-600 bg-green-50' : q.difficulty === 'Medium' ? 'text-yellow-600 bg-yellow-50' : 'text-red-600 bg-red-50'}`}>
                          {q.difficulty}
                        </span>
                      </label>
                    ))
                  }
                </div>
              </div>

              {/* Assign Students */}
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase mb-3">👨‍🎓 Assign Students ({form.assignedTo.length} selected)</p>
                <div className="border rounded-lg max-h-40 overflow-y-auto divide-y">
                  {students.length === 0
                    ? <p className="p-3 text-sm text-gray-400">No students found.</p>
                    : students.map(s => (
                      <label key={s._id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={form.assignedTo.includes(s._id)}
                          onChange={() => toggleStudent(s._id)} />
                        <span className="text-sm text-gray-700">{s.name}</span>
                        <span className="text-xs text-gray-400">{s.email}</span>
                      </label>
                    ))
                  }
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="bg-blue-600 text-white px-8 py-2.5 rounded-lg hover:bg-blue-700 text-sm font-medium">
                  Create Exam
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="border px-6 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Exams List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {exams.length === 0 && <p className="text-gray-400 col-span-3">No exams created yet.</p>}
          {exams.map(exam => {
            const status = getExamStatus(exam);
            const attemptedCount = attempted(exam);
            return (
              <div key={exam._id} className="bg-white rounded-xl shadow p-5 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-800 flex-1 pr-2">{exam.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${status.style}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{exam.subject} {exam.class && `• ${exam.class}`}</p>

                <div className="mt-3 space-y-1 text-sm text-gray-600">
                  <p>⏱ {exam.duration} mins • 📝 {exam.questions?.length || 0} Qs • 🎯 {exam.totalMarks} marks</p>
                  <p>👨‍🎓 Assigned: {exam.assignedTo?.length || 0} • ✅ Attempted: {attemptedCount}</p>
                </div>

                {/* Schedule Info */}
                {(exam.startTime || exam.endTime) && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-2 text-xs text-gray-500 space-y-1">
                    {exam.startTime && <p>🕐 Start: {formatDateTime(exam.startTime)}</p>}
                    {exam.endTime && <p>🕕 End: {formatDateTime(exam.endTime)}</p>}
                  </div>
                )}

                {/* Settings Icons */}
                <div className="mt-3 flex gap-2 flex-wrap">
                  {exam.shuffleQuestions && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded">🔀 Shuffle Q</span>}
                  {exam.shuffleOptions && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded">🔀 Shuffle Opt</span>}
                  {exam.cameraEnabled && <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded">📷 Camera</span>}
                  {exam.micEnabled && <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded">🎤 Mic</span>}
                </div>

                {/* Result Declaration */}
                <div className="mt-4 border-t pt-3">
                  {exam.resultDeclared ? (
                    <div className="bg-green-50 rounded-lg p-2 text-xs text-green-700 font-medium">
                      ✅ Result Declared
                      {exam.resultDeclaredAt && (
                        <span className="text-green-500 ml-1">— {formatDateTime(exam.resultDeclaredAt)}</span>
                      )}
                    </div>
                  ) : exam.resultDeclareAt ? (
                    <div className="bg-blue-50 rounded-lg p-2 text-xs text-blue-700 font-medium">
                      ⏰ Scheduled: {formatDateTime(exam.resultDeclareAt)}
                      <button
                        onClick={() => handleDeclareResult(exam._id)}
                        className="ml-2 text-blue-500 underline hover:text-blue-700">
                        Declare Now
                      </button>
                    </div>
                  ) : declaringExam === exam._id ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-600">📢 Declare Result</p>
                      <input type="datetime-local"
                        className="w-full border rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-400"
                        value={declareTime}
                        onChange={e => setDeclareTime(e.target.value)}
                        placeholder="Schedule time (optional)" />
                      <p className="text-xs text-gray-400">Leave empty to declare immediately</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDeclareResult(exam._id, !!declareTime)}
                          className="flex-1 bg-green-600 text-white py-1.5 rounded-lg text-xs hover:bg-green-700 font-medium">
                          {declareTime ? '⏰ Schedule' : '✅ Declare Now'}
                        </button>
                        <button
                          onClick={() => { setDeclaringExam(null); setDeclareTime(''); }}
                          className="px-3 py-1.5 border rounded-lg text-xs text-gray-500 hover:bg-gray-50">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeclaringExam(exam._id)}
                      className="w-full bg-indigo-600 text-white py-2 rounded-lg text-xs hover:bg-indigo-700 font-medium">
                      📢 Declare Result
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default ManageExams;