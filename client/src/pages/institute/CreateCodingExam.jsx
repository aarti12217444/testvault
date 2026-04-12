import { useState } from 'react';
import Layout from '../../components/Layout';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'java', label: 'Java' },
  { id: 'cpp', label: 'C++' },
  { id: 'c', label: 'C' },
  { id: 'csharp', label: 'C#' },
];

const defaultTestCase = () => ({ input: '', expectedOutput: '', isHidden: false, explanation: '' });

const CreateCodingExam = () => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    inputFormat: '',
    outputFormat: '',
    constraints: '',
    difficulty: 'Easy',
    marks: 10,
    timeLimit: 5,
    allowedLanguages: ['python', 'javascript', 'java', 'cpp', 'c', 'csharp'],
  });
  const [testCases, setTestCases] = useState([
    { ...defaultTestCase(), isHidden: false },
    { ...defaultTestCase(), isHidden: false },
    { ...defaultTestCase(), isHidden: true },
  ]);
  const [loading, setLoading] = useState(false);

  const handleLangToggle = (lang) => {
    setForm(f => ({
      ...f,
      allowedLanguages: f.allowedLanguages.includes(lang)
        ? f.allowedLanguages.filter(l => l !== lang)
        : [...f.allowedLanguages, lang],
    }));
  };

  const addTestCase = (hidden = false) => {
    setTestCases(tc => [...tc, { ...defaultTestCase(), isHidden: hidden }]);
  };

  const removeTestCase = (index) => {
    setTestCases(tc => tc.filter((_, i) => i !== index));
  };

  const updateTestCase = (index, field, value) => {
    setTestCases(tc => tc.map((t, i) => i === index ? { ...t, [field]: value } : t));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (testCases.length < 1) return toast.error('At least 1 test case required!');
    const hasOutput = testCases.every(tc => tc.expectedOutput.trim());
    if (!hasOutput) return toast.error('All test cases need expected output!');

    setLoading(true);
    try {
      await API.post('/coding/questions', { ...form, testCases });
      toast.success('Coding question created!');
      // Reset
      setForm({ title: '', description: '', inputFormat: '', outputFormat: '', constraints: '', difficulty: 'Easy', marks: 10, timeLimit: 5, allowedLanguages: ['python', 'javascript', 'java', 'cpp', 'c', 'csharp'] });
      setTestCases([{ ...defaultTestCase() }, { ...defaultTestCase() }, { ...defaultTestCase(), isHidden: true }]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating question');
    } finally {
      setLoading(false);
    }
  };

  const visibleCases = testCases.filter(tc => !tc.isHidden);
  const hiddenCases = testCases.filter(tc => tc.isHidden);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">💻 Create Coding Question</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Basic Info */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-700 mb-4">📋 Question Details</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Title *</label>
                <input type="text" required value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Two Sum, Fibonacci Series"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Problem Description *</label>
                <textarea required rows={5} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the problem clearly. Include examples if needed."
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Input Format</label>
                  <textarea rows={2} value={form.inputFormat}
                    onChange={e => setForm({ ...form, inputFormat: e.target.value })}
                    placeholder="e.g. First line contains N..."
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Output Format</label>
                  <textarea rows={2} value={form.outputFormat}
                    onChange={e => setForm({ ...form, outputFormat: e.target.value })}
                    placeholder="e.g. Print the answer on a single line..."
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"/>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Constraints</label>
                <input type="text" value={form.constraints}
                  onChange={e => setForm({ ...form, constraints: e.target.value })}
                  placeholder="e.g. 1 ≤ N ≤ 10^5, 0 ≤ arr[i] ≤ 10^9"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"/>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Difficulty</label>
                  <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400">
                    <option>Easy</option><option>Medium</option><option>Hard</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Marks</label>
                  <input type="number" min={1} value={form.marks}
                    onChange={e => setForm({ ...form, marks: parseInt(e.target.value) })}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Time Limit (sec)</label>
                  <input type="number" min={1} max={30} value={form.timeLimit}
                    onChange={e => setForm({ ...form, timeLimit: parseInt(e.target.value) })}
                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400"/>
                </div>
              </div>
            </div>
          </div>

          {/* Languages */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-semibold text-gray-700 mb-4">🌐 Allowed Languages</h3>
            <div className="flex flex-wrap gap-3">
              {LANGUAGES.map(lang => (
                <button type="button" key={lang.id}
                  onClick={() => handleLangToggle(lang.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    form.allowedLanguages.includes(lang.id)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}>
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visible Test Cases */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold text-gray-700">✅ Visible Test Cases</h3>
                <p className="text-xs text-gray-400 mt-1">Students can see these — shown as examples</p>
              </div>
              <button type="button" onClick={() => addTestCase(false)}
                className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100">
                + Add Visible
              </button>
            </div>
            <div className="space-y-4">
              {testCases.map((tc, i) => !tc.isHidden && (
                <div key={i} className="border border-blue-100 rounded-lg p-4 bg-blue-50">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-blue-700">Test Case {visibleCases.indexOf(tc) + 1}</span>
                    <button type="button" onClick={() => removeTestCase(i)}
                      className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Input</label>
                      <textarea rows={3} value={tc.input}
                        onChange={e => updateTestCase(i, 'input', e.target.value)}
                        placeholder="Input (leave empty if no input)"
                        className="mt-1 w-full border rounded px-2 py-1 text-sm font-mono outline-none focus:ring-1 focus:ring-blue-400"/>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Expected Output *</label>
                      <textarea rows={3} required value={tc.expectedOutput}
                        onChange={e => updateTestCase(i, 'expectedOutput', e.target.value)}
                        placeholder="Expected output"
                        className="mt-1 w-full border rounded px-2 py-1 text-sm font-mono outline-none focus:ring-1 focus:ring-blue-400"/>
                    </div>
                  </div>
                  <div className="mt-2">
                    <label className="text-xs text-gray-500">Explanation (optional)</label>
                    <input type="text" value={tc.explanation}
                      onChange={e => updateTestCase(i, 'explanation', e.target.value)}
                      placeholder="Explain this test case"
                      className="mt-1 w-full border rounded px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-400"/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hidden Test Cases */}
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-semibold text-gray-700">🔒 Hidden Test Cases</h3>
                <p className="text-xs text-gray-400 mt-1">Students cannot see these — used for final scoring</p>
              </div>
              <button type="button" onClick={() => addTestCase(true)}
                className="bg-orange-50 text-orange-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-100">
                + Add Hidden
              </button>
            </div>
            <div className="space-y-4">
              {testCases.map((tc, i) => tc.isHidden && (
                <div key={i} className="border border-orange-100 rounded-lg p-4 bg-orange-50">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium text-orange-700">
                      🔒 Hidden Test {hiddenCases.indexOf(tc) + 1}
                    </span>
                    <button type="button" onClick={() => removeTestCase(i)}
                      className="text-red-400 hover:text-red-600 text-xs">Remove</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Input</label>
                      <textarea rows={3} value={tc.input}
                        onChange={e => updateTestCase(i, 'input', e.target.value)}
                        placeholder="Input"
                        className="mt-1 w-full border rounded px-2 py-1 text-sm font-mono outline-none focus:ring-1 focus:ring-orange-400"/>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Expected Output *</label>
                      <textarea rows={3} required value={tc.expectedOutput}
                        onChange={e => updateTestCase(i, 'expectedOutput', e.target.value)}
                        placeholder="Expected output"
                        className="mt-1 w-full border rounded px-2 py-1 text-sm font-mono outline-none focus:ring-1 focus:ring-orange-400"/>
                    </div>
                  </div>
                </div>
              ))}
              {hiddenCases.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No hidden test cases yet — click "+ Add Hidden"</p>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-lg transition disabled:opacity-50">
            {loading ? '⏳ Creating...' : '✅ Create Coding Question'}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default CreateCodingExam;