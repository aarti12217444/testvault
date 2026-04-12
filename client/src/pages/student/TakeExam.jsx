import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import toast from 'react-hot-toast';
import * as faceapi from 'face-api.js';

const TakeExam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [warnings, setWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');
  const [examStarted, setExamStarted] = useState(false);
  const [cameraAllowed, setCameraAllowed] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const startTime = useRef(Date.now());
  const timerRef = useRef(null);
  const warningRef = useRef(0);
  const submittedRef = useRef(false);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const proctoringIntervalRef = useRef(null);

  // ========== SUSPICIOUS ACTIVITY LOG ==========
  const activityLog = useRef([]);

  const logActivity = useCallback((type, message) => {
    activityLog.current.push({
      type,
      message,
      time: new Date().toISOString(),
    });
  }, []);

  // ========== LOAD FACE-API MODELS ==========
  useEffect(() => {
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        setModelsLoaded(true);
        console.log('Face detection models loaded ✅');
      } catch (err) {
        console.error('Model load failed:', err);
      }
    };
    loadModels();
  }, []);

  // ========== EXAM LOAD ==========
  useEffect(() => {
    API.get('/exams/my-exams').then(r => {
      const found = r.data.find(e => e._id === id);
      if (found) {
        setExam(found);
        setTimeLeft(found.duration * 60);
      }
    });
  }, [id]);

  // ========== CAMERA START — FIXED ==========
  const startCamera = async () => {
    setCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setCameraAllowed(true);
      setCameraError('');

      const attachStream = (video) => {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play()
            .then(() => setCameraLoading(false))
            .catch(() => setCameraLoading(false));
        };
        // Fallback — 3 sec baad loading band karo chahe kuch bhi ho
        setTimeout(() => setCameraLoading(false), 3000);
      };

      if (videoRef.current) {
        // Video element already mounted hai
        attachStream(videoRef.current);
      } else {
        // Video element abhi mount nahi hua — wait karo
        const waitForVideo = setInterval(() => {
          if (videoRef.current) {
            clearInterval(waitForVideo);
            attachStream(videoRef.current);
          }
        }, 100);
        // 5 sec baad interval band karo
        setTimeout(() => clearInterval(waitForVideo), 5000);
      }
    } catch (err) {
      console.log('Camera error:', err.message);
      setCameraError('Camera access denied — exam will continue without proctoring.');
      setCameraAllowed(false);
      setCameraLoading(false);
      logActivity('camera_denied', 'Camera/Mic access denied by student');
    }
  };

  // ========== CAMERA STOP ==========
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // ========== FACE DETECTION + SNAPSHOT ==========
  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded || submittedRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState !== 4) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    let status = 'clear';
    try {
      const detections = await faceapi.detectAllFaces(
        canvas,
        new faceapi.TinyFaceDetectorOptions()
      );

      if (detections.length === 0) {
        status = 'no_face';
      } else if (detections.length > 1) {
        status = 'multiple_face';
      } else {
        const box = detections[0].box;
        const faceArea = box.width * box.height;
        const frameArea = canvas.width * canvas.height;
        const ratio = faceArea / frameArea;
        if (ratio < 0.05) {
          status = 'face_too_small';
        }
      }
    } catch (err) {
      console.log('Face detection error:', err);
      status = 'detection_error';
    }

    const photo = canvas.toDataURL('image/jpeg', 0.6);

    try {
      await API.post('/proctor/snapshot', {
        examId: id,
        photo,
        status,
        timestamp: new Date().toISOString(),
      });
      console.log(`📸 Snapshot saved — status: ${status}`);
    } catch (err) {
      console.log('Snapshot save failed:', err);
    }
  }, [id, modelsLoaded]);

  // ========== PROCTORING INTERVAL — har 30 sec ==========
  useEffect(() => {
    if (!examStarted || !cameraAllowed || submitted) return;

    const firstTimeout = setTimeout(() => {
      captureAndAnalyze();
    }, 5000);

    proctoringIntervalRef.current = setInterval(() => {
      captureAndAnalyze();
    }, 30000);

    return () => {
      clearTimeout(firstTimeout);
      clearInterval(proctoringIntervalRef.current);
    };
  }, [examStarted, cameraAllowed, submitted, captureAndAnalyze]);

  // ========== SUBMIT REASON CALCULATOR ==========
  const getSubmitReason = (autoReason) => {
    if (!autoReason) {
      return {
        reason: 'manual',
        label: 'Manually Submitted',
        suspiciousLevel: 'none',
        details: 'Student submitted the exam manually.',
      };
    }
    if (autoReason.includes('Time up')) {
      return {
        reason: 'time_up',
        label: 'Time Up — Auto Submitted',
        suspiciousLevel: 'low',
        details: 'Exam duration ended. Auto submitted by timer.',
      };
    }
    if (autoReason.includes('3 warnings') || autoReason.includes('warnings')) {
      const log = activityLog.current;
      const tabCount = log.filter(a => a.type === 'tab_switch').length;
      const extCount = log.filter(a => a.type === 'extension').length;
      const fsCount = log.filter(a => a.type === 'fullscreen_exit').length;
      const devCount = log.filter(a => a.type === 'devtools').length;

      if (extCount > 0) return { reason: 'extension_detected', label: 'Auto Submit — Extension Detected', suspiciousLevel: 'high', details: `Browser extension detected ${extCount} time(s).` };
      if (devCount > 0) return { reason: 'devtools_detected', label: 'Auto Submit — DevTools Detected', suspiciousLevel: 'high', details: `DevTools opened ${devCount} time(s).` };
      if (tabCount > 0) return { reason: 'tab_switch', label: 'Auto Submit — Tab Switching', suspiciousLevel: 'high', details: `Tab switched ${tabCount} time(s).` };
      if (fsCount > 0) return { reason: 'fullscreen_exit', label: 'Auto Submit — Fullscreen Violation', suspiciousLevel: 'moderate', details: `Exited fullscreen ${fsCount} time(s).` };
      return { reason: 'multiple_warnings', label: 'Auto Submit — Multiple Violations', suspiciousLevel: 'high', details: `3 warnings. Activities: ${log.map(a => a.type).join(', ')}` };
    }
    return { reason: 'auto_other', label: 'Auto Submitted', suspiciousLevel: 'moderate', details: autoReason };
  };

  // ========== SUBMIT ==========
  const handleSubmit = useCallback(async (auto = false, autoReason = '') => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);
    clearInterval(timerRef.current);
    clearInterval(proctoringIntervalRef.current);
    stopCamera();

    if (document.fullscreenElement) document.exitFullscreen();

    const timeTaken = Math.floor((Date.now() - startTime.current) / 1000);
    const answerArr = exam.questions.map(q => ({
      questionId: q._id,
      selectedAnswer: answers[q._id] || null,
    }));

    const submitInfo = getSubmitReason(auto ? autoReason : '');

    try {
      await API.post('/results/submit', {
        examId: exam._id,
        answers: answerArr,
        timeTaken,
        submitReason: submitInfo.reason,
        submitLabel: submitInfo.label,
        suspiciousLevel: submitInfo.suspiciousLevel,
        suspiciousDetails: submitInfo.details,
        activityLog: activityLog.current,
      });

      if (auto) toast.error(autoReason || 'Exam auto submitted!');
      else toast.success('Exam submitted successfully!');
      navigate('/student/results');
    } catch {
      toast.error('Submission failed');
    }
  }, [exam, answers, navigate]); // eslint-disable-line

  // ========== TIMER ==========
  useEffect(() => {
    if (!exam || submitted || !examStarted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleSubmit(true, 'Time up! Exam auto submitted.');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [exam, examStarted]); // eslint-disable-line

  // ========== WARNING SYSTEM ==========
  const giveWarning = useCallback((msg, type = 'warning') => {
    if (submittedRef.current) return;
    logActivity(type, msg);
    warningRef.current += 1;
    setWarnings(warningRef.current);
    setWarningMsg(msg);
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 3000);
    if (warningRef.current >= 3) {
      setTimeout(() => handleSubmit(true, '3 warnings! Exam auto submitted.'), 1000);
    }
  }, [handleSubmit, logActivity]);

  // ========== TAB SWITCH ==========
  useEffect(() => {
    if (!examStarted || submitted) return;
    const handleVisibility = () => {
      if (document.hidden) giveWarning(`⚠️ Warning ${warningRef.current + 1}/3: Tab switching not allowed!`, 'tab_switch');
    };
    const handleBlur = () => {
      if (!document.hidden) giveWarning(`⚠️ Warning ${warningRef.current + 1}/3: Do not leave exam window!`, 'tab_switch');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
    };
  }, [examStarted, submitted, giveWarning]);

  // ========== COPY PASTE DISABLE ==========
  useEffect(() => {
    if (!examStarted || submitted) return;
    const block = (e) => {
      e.preventDefault();
      logActivity('copy_paste', 'Student attempted copy/paste/cut');
      toast.error('Copy/Paste not allowed!');
    };
    document.addEventListener('copy', block);
    document.addEventListener('paste', block);
    document.addEventListener('cut', block);
    return () => {
      document.removeEventListener('copy', block);
      document.removeEventListener('paste', block);
      document.removeEventListener('cut', block);
    };
  }, [examStarted, submitted, logActivity]);

  // ========== RIGHT CLICK DISABLE ==========
  useEffect(() => {
    if (!examStarted || submitted) return;
    const block = (e) => e.preventDefault();
    document.addEventListener('contextmenu', block);
    return () => document.removeEventListener('contextmenu', block);
  }, [examStarted, submitted]);

  // ========== KEYBOARD BLOCK ==========
  useEffect(() => {
    if (!examStarted || submitted) return;
    const blockKeys = (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.key === 'a')
      ) {
        e.preventDefault();
        logActivity('devtools', 'Student attempted to open DevTools');
        toast.error('This action is not allowed during exam!');
      }
    };
    document.addEventListener('keydown', blockKeys);
    return () => document.removeEventListener('keydown', blockKeys);
  }, [examStarted, submitted, logActivity]);

  // ========== EXTENSION DETECTION ==========
  useEffect(() => {
    if (!examStarted || submitted) return;
    const detectExtensions = () => {
      if (submittedRef.current) return;
      const suspiciousSelectors = [
        '[class*="grammarly"]', '[id*="grammarly"]',
        '[class*="honey"]', '[id*="honey"]',
        '[class*="extension"]', '[id*="extension"]',
        '[class*="loom"]', '[id*="loom"]',
        '[class*="lastpass"]', '[id*="lastpass"]',
        '[class*="monica"]', '[id*="monica"]',
        '[class*="merlin"]', '[id*="merlin"]',
        '[class*="chatgpt"]', '[id*="chatgpt"]',
        '[class*="copilot"]', '[id*="copilot"]',
        '[class*="gpt"]', '[id*="gpt"]',
        'grammarly-desktop-integration',
      ];
      for (const selector of suspiciousSelectors) {
        try {
          if (document.querySelector(selector)) {
            giveWarning('⚠️ Browser extension detected! Disable extensions.', 'extension');
            return;
          }
        } catch {}
      }
      const scripts = document.querySelectorAll('script[src]');
      scripts.forEach(script => {
        if (script.src.includes('chrome-extension') || script.src.includes('moz-extension')) {
          giveWarning('⚠️ Extension script detected!', 'extension');
        }
      });
    };
    const interval = setInterval(detectExtensions, 5000);
    detectExtensions();
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const el = node;
            if (
              el.id?.toLowerCase().includes('grammarly') ||
              el.id?.toLowerCase().includes('extension') ||
              el.className?.toString().toLowerCase().includes('grammarly')
            ) {
              giveWarning('⚠️ Extension activity detected!', 'extension');
            }
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => { clearInterval(interval); observer.disconnect(); };
  }, [examStarted, submitted, giveWarning]);

  // ========== DEVTOOLS DETECTION ==========
  useEffect(() => {
    if (!examStarted || submitted) return;
    const detectDevTools = () => {
      if (submittedRef.current) return;
      const threshold = 160;
      if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
        giveWarning('⚠️ DevTools detected! Close developer tools.', 'devtools');
      }
    };
    const interval = setInterval(detectDevTools, 2000);
    return () => clearInterval(interval);
  }, [examStarted, submitted, giveWarning]);

  // ========== FULLSCREEN ==========
  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  };

  useEffect(() => {
    if (!examStarted || submitted) return;
    const handleFSChange = () => {
      if (!document.fullscreenElement && !submittedRef.current) {
        giveWarning(`⚠️ Warning ${warningRef.current + 1}/3: Do not exit fullscreen!`, 'fullscreen_exit');
        setTimeout(() => { if (!submittedRef.current) enterFullscreen(); }, 1000);
      }
    };
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, [examStarted, submitted, giveWarning]);

  // ========== FORMAT TIME ==========
  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // ========== START EXAM ==========
  const startExam = async () => {
    try { await startCamera(); } catch (err) { console.log('Camera error:', err); }
    enterFullscreen();
    setExamStarted(true);
    startTime.current = Date.now();
  };

  if (!exam) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-lg">Loading exam...</p>
    </div>
  );

  // ========== INSTRUCTIONS PAGE ==========
  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">📋 {exam.title}</h2>
          <p className="text-gray-500 mb-6">{exam.subject} • {exam.questions.length} Questions • {exam.duration} mins</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-4">
            <h3 className="font-bold text-yellow-800 mb-3">⚠️ Exam Rules:</h3>
            <ul className="space-y-2 text-sm text-yellow-700">
              <li>🖥️ Exam will open in <strong>fullscreen mode</strong></li>
              <li>📷 <strong>Camera & Microphone</strong> required for proctoring</li>
              <li>📸 <strong>Snapshots</strong> taken every 30 seconds for face verification</li>
              <li>🚫 <strong>Tab switching</strong> is not allowed</li>
              <li>🚫 <strong>Copy/Paste</strong> is disabled</li>
              <li>🚫 <strong>Right click</strong> is disabled</li>
              <li>🚫 <strong>DevTools</strong> are blocked</li>
              <li>🚫 <strong>Browser extensions</strong> are not allowed</li>
              <li>⚠️ <strong>3 warnings</strong> = Exam auto submit</li>
              <li>⏱️ Time limit: <strong>{exam.duration} minutes</strong></li>
            </ul>
          </div>

          {!modelsLoaded && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-blue-700 text-sm">⏳ Loading face detection models...</p>
            </div>
          )}
          {modelsLoaded && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
              <p className="text-green-600 text-sm font-medium">✅ Face detection ready</p>
            </div>
          )}

          {cameraError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <p className="text-red-600 text-sm font-medium">❌ {cameraError}</p>
              <button onClick={startCamera} className="mt-2 bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-red-700">🔄 Try Again</button>
            </div>
          )}
          {cameraAllowed && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <p className="text-green-600 text-sm font-medium">✅ Camera & Microphone access granted!</p>
            </div>
          )}
          {!cameraAllowed && !cameraError && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-blue-700 text-sm">📷 Camera & Mic permission will be requested when you click Start Exam.</p>
            </div>
          )}

          <button onClick={startExam} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700 transition">
            🚀 Start Exam (Fullscreen)
          </button>
        </div>
      </div>
    );
  }

  const q = exam.questions[current];

  // ========== EXAM UI ==========
  return (
    <div className="min-h-screen bg-gray-100 p-4 select-none">

      {/* Hidden canvas for face capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Camera preview */}
      {cameraAllowed && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-red-500">
            <div className="bg-red-600 px-3 py-1 flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-white text-xs font-medium">🔴 LIVE Proctoring</span>
            </div>
            {cameraLoading ? (
              <div className="w-48 h-36 bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-white text-xs">Camera loading...</p>
                </div>
              </div>
            ) : (
              <video ref={videoRef} autoPlay muted playsInline className="w-48 h-36 object-cover" />
            )}
          </div>
        </div>
      )}

      {/* Warning popup */}
      {showWarning && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-xl shadow-2xl text-center">
          <p className="font-bold text-lg">{warningMsg}</p>
          <p className="text-sm mt-1">{warnings >= 3 ? '🚨 Submitting exam...' : `${3 - warnings} warning(s) remaining!`}</p>
        </div>
      )}

      {/* Warning bar */}
      {warnings > 0 && (
        <div className={`fixed top-0 left-0 right-0 z-40 text-white text-center py-1.5 text-sm font-medium ${
          warnings === 1 ? 'bg-yellow-500' : warnings === 2 ? 'bg-orange-500' : 'bg-red-600'
        }`}>
          ⚠️ Warnings: {warnings}/3
          {warnings === 2 && ' — One more violation = auto submit!'}
          {warnings >= 3 && ' — Submitting now...'}
        </div>
      )}

      {/* Header */}
      <div className={`bg-white rounded-xl shadow p-4 flex justify-between items-center mb-4 max-w-5xl mx-auto ${warnings > 0 ? 'mt-8' : ''}`}>
        <div>
          <h2 className="font-bold text-gray-800">{exam.title}</h2>
          <p className="text-sm text-gray-500">{exam.subject} • {exam.questions.length} Questions</p>
        </div>
        <div className="flex items-center gap-4">
          {cameraAllowed && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">🔴 Proctoring ON</span>}
          <div className={`text-2xl font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-blue-600'}`}>⏱ {formatTime(timeLeft)}</div>
        </div>
      </div>

      {/* Main exam area */}
      <div className="max-w-5xl mx-auto grid grid-cols-4 gap-4">
        <div className="col-span-3 bg-white rounded-xl shadow p-6">
          <p className="text-sm text-gray-400 mb-2">Question {current + 1} of {exam.questions.length}</p>
          <p className="text-gray-800 font-medium text-lg mb-6">{q.questionText}</p>
          <div className="space-y-3">
            {['A', 'B', 'C', 'D'].map(opt => (
              <button key={opt}
                onClick={() => setAnswers({ ...answers, [q._id]: opt })}
                className={`w-full text-left px-5 py-3 rounded-xl border-2 transition text-sm font-medium ${
                  answers[q._id] === opt ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300'
                }`}>
                <span className="font-bold mr-3">{opt}.</span>{q.options[opt]}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-8">
            <button disabled={current === 0} onClick={() => setCurrent(c => c - 1)}
              className="px-5 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
            {current < exam.questions.length - 1
              ? <button onClick={() => setCurrent(c => c + 1)} className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Next →</button>
              : <button onClick={() => handleSubmit(false)} className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">✅ Submit Exam</button>
            }
          </div>
        </div>

        {/* Sidebar */}
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm font-semibold text-gray-600 mb-3">Questions</p>
          <div className="grid grid-cols-4 gap-1">
            {exam.questions.map((qq, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`w-8 h-8 rounded text-xs font-medium ${
                  current === i ? 'bg-blue-600 text-white' :
                  answers[qq._id] ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>{i + 1}</button>
            ))}
          </div>
          <div className="mt-4 space-y-1 text-xs text-gray-500">
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-green-500 rounded"></span> Answered</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-gray-200 rounded"></span> Not answered</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-600 rounded"></span> Current</div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-semibold text-gray-600 mb-2">⚠️ Warnings</p>
            <div className="flex gap-1">
              {[1, 2, 3].map(w => (
                <div key={w} className={`flex-1 h-2 rounded-full ${warnings >= w ? 'bg-red-500' : 'bg-gray-200'}`}></div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">{warnings}/3 used</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeExam;