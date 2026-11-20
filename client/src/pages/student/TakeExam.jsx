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
  const [saveStatus, setSaveStatus] = useState('');
  const autoSaveTimerRef = useRef(null);
  const retrySaveRef = useRef(null);
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
  const [passkey, setPasskey] = useState('');
  const [passkeyVerified, setPasskeyVerified] = useState(false);
  const [verifyingPasskey, setVerifyingPasskey] = useState(false);

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

  useEffect(() => {

 
const loadExam = async () => {
  try {
    const response = await API.get('/exams/my-exams');

    const found = response.data.find(
      e => e._id === id
    );

    if (!found) {
      toast.error('Exam not found or not assigned to you');
      return;
    }

    setExam(found);
    setTimeLeft(found.duration * 60);

  } catch (err) {
    console.error('Exam loading failed:', err);
    toast.error('Failed to load exam');
  }
};

loadExam();

}, [id]);


useEffect(() => {

  return () => {
    clearTimeout(autoSaveTimerRef.current);
  };

}, []);

 //===================VERIFY PASSKEY=========================
  
const verifyExamPasskey = async () => {
  if (!passkey.trim()) {
    toast.error('Please enter the exam passkey');
    return;
  }

  try {
    setVerifyingPasskey(true);

    const response = await API.post(
      `/exams/${id}/verify-passkey`,
      { passkey: passkey.trim() }
    );

    if (response.data?.exam) {
      setExam(response.data.exam);
      setPasskeyVerified(true);

      // Restore saved answers after successful verification
      try {
        const draftResponse = await API.get(
          `/results/draft/${id}`
        );

        if (
          draftResponse.data.found &&
          Array.isArray(draftResponse.data.answers)
        ) {
          const restoredAnswers = {};

          draftResponse.data.answers.forEach((ans) => {
            if (ans.selectedAnswer) {
              restoredAnswers[ans.questionId] =
                ans.selectedAnswer;
            }
          });

          setAnswers(restoredAnswers);

          if (
            typeof draftResponse.data.currentQuestionIndex === 'number'
          ) {
            const maxIndex =
              response.data.exam.questions.length - 1;

            setCurrent(
              Math.min(
                Math.max(
                  draftResponse.data.currentQuestionIndex,
                  0
                ),
                Math.max(maxIndex, 0)
              )
            );
          }
        }
      } catch (draftError) {
        console.log('No draft answers found');
      }

      toast.success('Passkey verified successfully');
    }
  } catch (err) {
    toast.error(
      err.response?.data?.message || 'Passkey verification failed'
    );
  } finally {
    setVerifyingPasskey(false);
  }
};

 
  // ========== CAMERA START ==========
  const startCamera = async () => {
    setCameraLoading(true);
    setCameraError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;
      setCameraAllowed(true);

      console.log('Camera permission granted');
      return true;
    } catch (err) {
      console.error('Camera error:', err);

      setCameraAllowed(false);
      setCameraError(
        'Camera access failed. Please allow camera and microphone permissions.'
      );

      logActivity('camera_denied', `Camera error: ${err.message}`);
      setCameraLoading(false);

      return false;
    }
  };

  // ========== ATTACH STREAM AFTER VIDEO MOUNTS ==========
  useEffect(() => {
    if (!examStarted || !cameraAllowed) return;

    const video = videoRef.current;
    const stream = streamRef.current;

    if (!video || !stream) {
      setCameraLoading(false);
      setCameraError('Camera preview could not be initialized.');
      return;
    }

    let cancelled = false;

    const playVideo = async () => {
      try {
        video.srcObject = stream;
        await video.play();

        if (!cancelled) {
          setCameraLoading(false);
          setCameraError('');
          console.log('Camera preview playing');
        }
      } catch (err) {
        console.error('Video preview error:', err);

        if (!cancelled) {
          setCameraLoading(false);
          setCameraError('Camera opened, but video preview failed.');
        }
      }
    };

    playVideo();

    return () => {
      cancelled = true;
    };
  }, [examStarted, cameraAllowed]);

  // ========== START EXAM ==========
  const startExam = async () => {
    // Request fullscreen directly from the button click.
    enterFullscreen();

    const cameraStarted = await startCamera();

    if (!cameraStarted) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      return;
    }

    startTime.current = Date.now();
    setExamStarted(true);
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

  // ========== AUTO SAVE ANSWERS ==========
const autoSaveAnswers = useCallback(async (updatedAnswers) => {
  if (!exam || submittedRef.current || !examStarted) return;

  try {
    setSaveStatus('saving');

    const answerArr = exam.questions.map(q => ({
      questionId: q._id,
      selectedAnswer: updatedAnswers[q._id] || null
    }));

    await API.put('/results/auto-save', {
      examId: exam._id,
      answers: answerArr,
      currentQuestionIndex: current
    });

    setSaveStatus('saved');

    // 2 seconds baad status hide
    setTimeout(() => {
      setSaveStatus('');
    }, 2000);

  } catch (err) {

    console.error('Auto-save failed:', err);

    setSaveStatus('failed');

  }
}, [exam, examStarted, current]);

// ========== AUTO SAVE RETRY WHEN INTERNET RETURNS ==========

useEffect(() => {
  const handleOnline = () => {
    if (!exam || submittedRef.current) return;

    if (Object.keys(answers).length > 0) {
      clearTimeout(retrySaveRef.current);

      retrySaveRef.current = setTimeout(() => {
        autoSaveAnswers(answers);
      }, 500);
    }
  };

  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('online', handleOnline);
    clearTimeout(retrySaveRef.current);
  };
}, [exam, answers, autoSaveAnswers]);


// ========== OFFLINE DETECTION ==========

useEffect(() => {
  const handleOffline = () => {
    if (!submittedRef.current) {
      setSaveStatus('offline');
    }
  };

  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('offline', handleOffline);
  };
}, []);




  // ========== SUBMIT ==========
  const handleSubmit = useCallback(async (auto = false, autoReason = '') => {
    if (submittedRef.current) return;
    // Pending auto-save ko cancel karo
    clearTimeout(autoSaveTimerRef.current);

    
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
  }, [exam, examStarted, submitted, handleSubmit]); // eslint-disable-line

  // ========== WARNING SYSTEM ==========
  
const warningSubmitTimerRef = useRef(null);

const giveWarning = useCallback((msg, type = 'warning') => {
  if (submittedRef.current) return;

  logActivity(type, msg);

  warningRef.current += 1;
  setWarnings(warningRef.current);
  setWarningMsg(msg);
  setShowWarning(true);

  setTimeout(() => setShowWarning(false), 3000);

  if (
    warningRef.current >= 3 &&
    !submittedRef.current &&
    warningSubmitTimerRef.current === null
  ) {
    warningSubmitTimerRef.current = setTimeout(() => {
      warningSubmitTimerRef.current = null;

      if (!submittedRef.current) {
        handleSubmit(true, '3 warnings! Exam auto submitted.');
      }
    }, 1000);
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
  // const startExam = async () => {
  //   try { await startCamera(); } catch (err) { console.log('Camera error:', err); }
  //   enterFullscreen();
  //   setExamStarted(true);
  //   startTime.current = Date.now();
  // };

  
if (!exam) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <p className="text-slate-600">Loading exam...</p>
    </div>
  );
}

if (!passkeyVerified) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-xl">
        <h2 className="text-2xl font-bold text-slate-800">
          🔐 Enter Exam Passkey
        </h2>

        <p className="mt-2 mb-5 text-sm text-slate-500">
          Enter the passkey shared by your teacher.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            verifyExamPasskey();
          }}
        >
          <input
            type="text"
            value={passkey}
            onChange={(e) => setPasskey(e.target.value.toUpperCase())}
            placeholder="Enter 8-character passkey"
            maxLength={8}
            required
            className="w-full rounded-xl border border-slate-300 p-3 text-center font-bold tracking-widest uppercase"
          />

          <button
            type="submit"
            disabled={verifyingPasskey || !passkey.trim()}
            className="mt-4 w-full rounded-xl bg-blue-600 p-3 font-semibold text-white disabled:opacity-50"
          >
            {verifyingPasskey ? 'Verifying...' : 'Verify Passkey'}
          </button>
        </form>
      </div>
    </div>
  );
}


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
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 select-none">

    
      {!passkeyVerified && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-100/95 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl">
            <div className="mb-5 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-2xl">
                🔐
              </div>

              <h2 className="text-2xl font-bold text-slate-800">
                Enter Exam Passkey
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Enter the passkey shared by your teacher to access this exam.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                verifyExamPasskey();
              }}
            >
              <label
                htmlFor="exam-passkey"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Exam Passkey
              </label>

              <input
                id="exam-passkey"
                type="text"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value.toUpperCase())}
                placeholder="Enter your 8-character passkey"
                maxLength={8}
                autoComplete="off"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-lg font-bold tracking-[0.2em] uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="submit"
                disabled={verifyingPasskey || !passkey.trim()}
                className="mt-5 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verifyingPasskey ? 'Verifying...' : 'Verify Passkey'}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-slate-400">
              Contact your teacher if you do not have the passkey.
            </p>
          </div>
        </div>
      )}
      {/* {(!exam || !passkeyVerified) && (
        <div className="fixed inset-0 z-[90] bg-slate-100" />
      )} */}

      {/* Hidden canvas for face capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Camera Preview */}
{(cameraAllowed || cameraLoading) && (
  <div className="fixed bottom-5 right-5 z-50 w-64 overflow-hidden rounded-2xl border border-white/20 bg-slate-950 shadow-2xl">
    <div className="flex items-center justify-between bg-gradient-to-r from-red-600 to-rose-500 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
        <span className="text-xs font-semibold tracking-wide text-white">
          LIVE PROCTORING
        </span>
      </div>

      <span className="text-xs text-white/90">
        {cameraAllowed ? 'Active' : 'Connecting'}
      </span>
    </div>

    <div className="relative aspect-video bg-slate-900">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="h-full w-full object-cover"
      />

      {cameraLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <p className="text-xs text-slate-200">
            Connecting to camera...
          </p>
        </div>
      )}

      {!cameraLoading && cameraAllowed && (
        <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-1 text-[10px] text-white">
          Camera connected
        </div>
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
      <div className={` bg-white rounded-2xl border border-slate-200 shadow-sm
        p-5 flex flex-wrap justify-between items-center gap-4
        mb-6 max-w-7xl mx-auto`}>
       
        <div>
          <h2 className="font-bold text-gray-800">{exam.title}</h2>
          <p className="text-sm text-gray-500">{exam.subject} • {exam.questions.length} Questions</p>
        </div>
        <div className="flex items-center gap-4">

          {cameraAllowed && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-medium">
              🔴 Proctoring ON
            </span>
          )}

          {saveStatus === 'saving' && (
            <span className="text-xs text-yellow-600 font-medium">
              💾 Saving...
            </span>
          )}

          {saveStatus === 'saved' && (
            <span className="text-xs text-green-600 font-medium">
              ✓ Saved
            </span>
          )}

          {saveStatus === 'failed' && (
            <span className="text-xs text-red-600 font-medium">
              ⚠️ Save failed
            </span>
          )}

          <div className={`text-2xl font-bold ${
            timeLeft < 60 ? 'text-red-500' : 'text-blue-600'
          }`}>
            ⏱ {formatTime(timeLeft)}
          </div>

        </div>

      {/* Main exam area */}
      
        <div className="max-w-7xl mx-auto w-full px-3 sm:px-5 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-5 lg:gap-6 items-start">

            {/* Question Card */}
            <div className="min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7 md:p-8">

              {/* Question Header */}
              <div className="mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-medium text-slate-500">
                    Question {current + 1} of {exam.questions.length}
                  </p>

                  <span className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700">
                    {answers[q._id] ? "Answer selected" : "Not answered"}
                  </span>
                </div>

                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${((current + 1) / exam.questions.length) * 100}%`
                    }}
                  />
                </div>
              </div>

              {/* Question Text */}
              <div className="min-h-[70px] mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-slate-800 leading-relaxed break-words">
                  {q.questionText}
                </h2>
                <p className="text-sm text-slate-400 mt-2">
                  Select one option from the choices below.
                </p>
              </div>

              {/* Answer Options */}
              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const updatedAnswers = {
                        ...answers,
                        [q._id]: opt
                      };

                      setAnswers(updatedAnswers);

                      clearTimeout(autoSaveTimerRef.current);

                      autoSaveTimerRef.current = setTimeout(() => {
                        autoSaveAnswers(updatedAnswers);
                      }, 700);
                    }}
                    className={`w-full min-w-0 flex items-start gap-3 text-left p-4 rounded-xl border-2 transition-colors duration-200 ${
                      answers[q._id] === opt
                        ? 'border-blue-500 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                        answers[q._id] === opt
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {opt}
                    </span>

                    <span className="flex-1 min-w-0 pt-1 text-sm sm:text-base leading-relaxed break-words">
                      {q.options[opt]}
                    </span>

                    {answers[q._id] === opt && (
                      <span className="text-blue-600 font-bold shrink-0 pt-1">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="mt-8 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={current === 0}
                  onClick={() => setCurrent(c => c - 1)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>

                {current < exam.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrent(c => c + 1)}
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
                  >
                    ✓ Submit Exam
                  </button>
                )}
              </div>

            </div>

            {/* Sidebar */}
            <aside className="min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700">
                  Questions
                </h3>
                <span className="text-xs text-slate-400">
                  {Object.values(answers).filter(Boolean).length}/{exam.questions.length}
                </span>
              </div>

              {/* Question Number Grid */}
              <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2">
                {exam.questions.map((qq, i) => (
                  <button
                    key={qq._id || i}
                    type="button"
                    onClick={() => setCurrent(i)}
                    aria-label={`Go to question ${i + 1}`}
                    aria-current={current === i ? 'step' : undefined}
                    className={`h-9 w-full rounded-lg text-sm font-semibold transition-colors ${
                      current === i
                        ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                        : answers[qq._id]
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                  Answered
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-sm bg-slate-200" />
                  Not answered
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
                  Current question
                </div>
              </div>

              {/* Warnings */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-700">
                    ⚠️ Warnings
                  </p>
                  <span className="text-xs font-medium text-slate-500">
                    {warnings}/3
                  </span>
                </div>

                <div className="flex gap-2">
                  {[1, 2, 3].map(w => (
                    <div
                      key={w}
                      className={`flex-1 h-2 rounded-full ${
                        warnings >= w ? 'bg-red-500' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs text-slate-400 mt-2">
                  Warning limit: 3
                </p>
              </div>

            </aside>
          </div>
        </div>

      


    </div>
     </div>
  );
};

export default TakeExam;