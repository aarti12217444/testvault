import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import API from '../../api/axios';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { id: 'python',     label: 'Python',      monaco: 'python' },
  { id: 'javascript', label: 'JavaScript',  monaco: 'javascript' },
  { id: 'java',       label: 'Java',        monaco: 'java' },
  { id: 'cpp',        label: 'C++',         monaco: 'cpp' },
  { id: 'c',          label: 'C',           monaco: 'c' },
  { id: 'csharp',     label: 'C#',          monaco: 'csharp' },
];

const STARTER_CODE = {
  python:     '# Write your solution here\n\n',
  javascript: '// Write your solution here\nconst readline = require("readline");\nconst rl = readline.createInterface({ input: process.stdin });\nlet lines = [];\nrl.on("line", line => lines.push(line.trim()));\nrl.on("close", () => {\n  // Your code here\n  console.log();\n});\n',
  java:       'import java.util.Scanner;\n\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    // Write your solution here\n    \n  }\n}\n',
  cpp:        '#include<bits/stdc++.h>\nusing namespace std;\n\nint main() {\n  // Write your solution here\n  \n  return 0;\n}\n',
  c:          '#include<stdio.h>\n\nint main() {\n  // Write your solution here\n  \n  return 0;\n}\n',
  csharp:     'using System;\n\nclass Program {\n  static void Main() {\n    // Write your solution here\n    \n  }\n}\n',
};

const TakeCodingExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [question, setQuestion] = useState(null);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(STARTER_CODE['python']);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResults, setRunResults] = useState(null);
  const [submitResults, setSubmitResults] = useState(null);
  const [activeTab, setActiveTab] = useState('problem');

  useEffect(() => {
    API.get(`/coding/questions/${id}`)
      .then(r => setQuestion(r.data))
      .catch(() => toast.error('Question not found'));
  }, [id]);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setCode(STARTER_CODE[lang]);
    setRunResults(null);
    setSubmitResults(null);
  };

  const handleRun = async () => {
    if (!code.trim()) return toast.error('Write some code first!');
    setRunning(true);
    setRunResults(null);
    setActiveTab('results');
    try {
      const { data } = await API.post('/coding/run', { code, language, questionId: id });
      setRunResults(data.results);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Run failed');
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) return toast.error('Write some code first!');
    if (!window.confirm('Submit your solution? This will be your final answer.')) return;
    setSubmitting(true);
    setActiveTab('results');
    try {
      const { data } = await API.post('/coding/submit', { code, language, questionId: id });
      setSubmitResults(data);
      if (data.summary.percentage === 100) {
        toast.success('🎉 All test cases passed!');
      } else {
        toast(`${data.summary.passed}/${data.summary.total} test cases passed`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!question) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">Loading question...</p>
    </div>
  );

  const allowedLangs = LANGUAGES.filter(l => question.allowedLanguages?.includes(l.id));
  const currentLang = LANGUAGES.find(l => l.id === language);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col" style={{ fontFamily: 'monospace' }}>

      {/* Header */}
      <div className="bg-gray-800 px-6 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white text-sm">← Back</button>
          <h1 className="text-white font-semibold text-sm">{question.title}</h1>
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
            question.difficulty === 'Easy' ? 'bg-green-900 text-green-300' :
            question.difficulty === 'Medium' ? 'bg-yellow-900 text-yellow-300' :
            'bg-red-900 text-red-300'
          }`}>{question.difficulty}</span>
          <span className="text-xs text-gray-400">{question.marks} marks</span>
        </div>

        {/* Language selector */}
        <div className="flex items-center gap-3">
          <select value={language} onChange={e => handleLanguageChange(e.target.value)}
            className="bg-gray-700 text-white text-sm px-3 py-1.5 rounded border border-gray-600 outline-none">
            {allowedLangs.map(l => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>

        {/* Left — Problem / Results */}
        <div className="w-2/5 bg-white flex flex-col border-r border-gray-200">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {['problem', 'results'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-3 text-sm font-medium capitalize transition ${
                  activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {tab === 'results' ? (submitResults ? '📊 Results' : '▶ Test Results') : '📋 Problem'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === 'problem' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-2">{question.title}</h2>
                  <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">{question.description}</p>
                </div>
                {question.inputFormat && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Input Format</h4>
                    <p className="text-sm text-gray-600">{question.inputFormat}</p>
                  </div>
                )}
                {question.outputFormat && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Output Format</h4>
                    <p className="text-sm text-gray-600">{question.outputFormat}</p>
                  </div>
                )}
                {question.constraints && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">Constraints</h4>
                    <p className="text-sm text-gray-600 font-mono">{question.constraints}</p>
                  </div>
                )}

                {/* Visible test cases as examples */}
                {question.testCases?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Examples</h4>
                    {question.testCases.map((tc, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3 mb-3 border border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Example {i + 1}</p>
                        {tc.input && (
                          <div className="mb-2">
                            <span className="text-xs text-gray-500">Input:</span>
                            <pre className="text-xs bg-gray-100 px-2 py-1 rounded mt-1 font-mono">{tc.input}</pre>
                          </div>
                        )}
                        <div>
                          <span className="text-xs text-gray-500">Output:</span>
                          <pre className="text-xs bg-gray-100 px-2 py-1 rounded mt-1 font-mono">{tc.expectedOutput}</pre>
                        </div>
                        {tc.explanation && (
                          <p className="text-xs text-gray-500 mt-2">💡 {tc.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'results' && (
              <div>
                {running && (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
                    <p className="text-gray-500 text-sm">Running your code...</p>
                  </div>
                )}
                {submitting && (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
                    <p className="text-gray-500 text-sm">Submitting and testing all cases...</p>
                  </div>
                )}

                {/* Submit results */}
                {submitResults && !submitting && (
                  <div>
                    <div className={`rounded-xl p-4 mb-4 ${
                      submitResults.summary.percentage === 100
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <h3 className={`font-bold text-lg mb-1 ${
                        submitResults.summary.percentage === 100 ? 'text-green-700' : 'text-yellow-700'
                      }`}>
                        {submitResults.summary.percentage === 100 ? '🎉 All Passed!' : '⚠️ Partial Pass'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {submitResults.summary.passed}/{submitResults.summary.total} test cases passed
                      </p>
                      <p className="text-sm font-semibold text-gray-700 mt-1">
                        Score: {submitResults.summary.score}/{question.marks}
                      </p>
                    </div>
                    {submitResults.results.map((r, i) => (
                      <div key={i} className={`border rounded-lg p-3 mb-2 ${
                        r.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            {r.passed ? '✅' : '❌'} Test {r.testCase}
                            {r.isHidden && <span className="ml-2 text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">Hidden</span>}
                          </span>
                          <span className={`text-xs font-medium ${r.passed ? 'text-green-600' : 'text-red-600'}`}>
                            {r.passed ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                        {!r.isHidden && !r.passed && (
                          <div className="mt-2 text-xs space-y-1">
                            {r.input && <div><span className="text-gray-500">Input: </span><code className="bg-gray-100 px-1 rounded">{r.input}</code></div>}
                            <div><span className="text-gray-500">Expected: </span><code className="bg-gray-100 px-1 rounded">{r.expectedOutput}</code></div>
                            <div><span className="text-gray-500">Got: </span><code className="bg-red-100 px-1 rounded">{r.actualOutput || 'No output'}</code></div>
                            {r.stderr && <div className="text-red-500 font-mono">{r.stderr}</div>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Run results */}
                {runResults && !running && !submitResults && (
                  <div>
                    <p className="text-sm text-gray-500 mb-3">Visible test cases only</p>
                    {runResults.map((r, i) => (
                      <div key={i} className={`border rounded-lg p-3 mb-2 ${
                        r.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium">{r.passed ? '✅' : '❌'} Test {r.testCase}</span>
                          <span className={`text-xs ${r.passed ? 'text-green-600' : 'text-red-600'}`}>
                            {r.passed ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                        <div className="text-xs space-y-1">
                          {r.input && <div><span className="text-gray-500">Input: </span><code className="bg-gray-100 px-1 rounded">{r.input}</code></div>}
                          <div><span className="text-gray-500">Expected: </span><code className="bg-gray-100 px-1 rounded">{r.expectedOutput}</code></div>
                          <div><span className="text-gray-500">Output: </span><code className={`px-1 rounded ${r.passed ? 'bg-green-100' : 'bg-red-100'}`}>{r.actualOutput || 'No output'}</code></div>
                          {r.stderr && <div className="text-red-500 font-mono">{r.stderr.substring(0, 200)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!running && !submitting && !runResults && !submitResults && (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">Run your code to see results here</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right — Code Editor */}
        <div className="flex-1 flex flex-col bg-gray-900">
          <div className="flex-1">
            <Editor
              height="100%"
              language={currentLang?.monaco || 'python'}
              value={code}
              onChange={val => setCode(val || '')}
              theme="vs-dark"
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                folding: true,
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          </div>

          {/* Bottom action bar */}
          <div className="bg-gray-800 px-6 py-3 flex items-center justify-between border-t border-gray-700">
            <div className="text-xs text-gray-400">
              Time limit: {question.timeLimit}s &nbsp;|&nbsp; {question.testCases?.length} test cases
            </div>
            <div className="flex gap-3">
              <button onClick={handleRun} disabled={running || submitting}
                className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
                {running ? '⏳ Running...' : '▶ Run'}
              </button>
              <button onClick={handleSubmit} disabled={running || submitting || !!submitResults}
                className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50">
                {submitting ? '⏳ Submitting...' : submitResults ? '✅ Submitted' : '🚀 Submit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeCodingExam;