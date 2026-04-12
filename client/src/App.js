import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';

import Login from './pages/Login';
import SuperDashboard from './pages/superadmin/SuperDashboard';
import ManageInstitutes from './pages/superadmin/ManageInstitutes';
import InstituteDashboard from './pages/institute/InstituteDashboard';
import ManageStudents from './pages/institute/ManageStudents';
import QuestionBank from './pages/institute/QuestionBank';
import ManageExams from './pages/institute/ManageExams';
import InstituteResults from './pages/institute/InstituteResults';
import StudentReportCard from './pages/institute/StudentReportCard';
import StudentDashboard from './pages/student/StudentDashboard';
import TakeExam from './pages/student/TakeExam';
import MyResults from './pages/student/MyResults';
import ProtectedRoute from './components/ProtectedRoute';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import StudentProfile from './pages/student/StudentProfile';
import InstituteProfile from './pages/institute/InstituteProfile';
import SuperAdminProfile from './pages/superadmin/SuperAdminProfile';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Leaderboard from './pages/student/Leaderboard';
import CreateCodingExam from './pages/institute/CreateCodingExam';
import TakeCodingExam from './pages/student/TakeCodingExam';




function App() {
  const { user } = useAuth();

  const getHome = () => {
    if (!user) return '/login';
    if (user.role === 'superadmin') return '/super/dashboard';
    if (user.role === 'institute') return '/institute/dashboard';
    return '/student/dashboard';
  };

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to={getHome()} />} />

        {/* Super Admin */}
        <Route path="/super/dashboard" element={<ProtectedRoute role="superadmin"><SuperDashboard /></ProtectedRoute>} />
        <Route path="/super/institutes" element={<ProtectedRoute role="superadmin"><ManageInstitutes /></ProtectedRoute>} />

        {/* Institute */}
        <Route path="/institute/dashboard" element={<ProtectedRoute role="institute"><InstituteDashboard /></ProtectedRoute>} />
        <Route path="/institute/students" element={<ProtectedRoute role="institute"><ManageStudents /></ProtectedRoute>} />
        <Route path="/institute/questions" element={<ProtectedRoute role="institute"><QuestionBank /></ProtectedRoute>} />
        <Route path="/institute/exams" element={<ProtectedRoute role="institute"><ManageExams /></ProtectedRoute>} />
        <Route path="/institute/results" element={<ProtectedRoute role="institute"><InstituteResults /></ProtectedRoute>} />
        <Route path="/institute/report/:studentId" element={<ProtectedRoute role="institute"><StudentReportCard /></ProtectedRoute>} />

        {/* Student */}
        <Route path="/student/dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/exam/:id" element={<ProtectedRoute role="student"><TakeExam /></ProtectedRoute>} />
        <Route path="/student/results" element={<ProtectedRoute role="student"><MyResults /></ProtectedRoute>} />
        <Route path="/student/leaderboard" element={<ProtectedRoute role="student"><Leaderboard /></ProtectedRoute>} />

        {/* Auth */}
        <Route path="/register" element={!user ? <Register /> : <Navigate to={getHome()} />} />
        <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to={getHome()} />} />

        {/* Profiles */}
        <Route path="/student/profile" element={<ProtectedRoute role="student"><StudentProfile /></ProtectedRoute>} />
        <Route path="/institute/profile" element={<ProtectedRoute role="institute"><InstituteProfile /></ProtectedRoute>} />
        <Route path="/superadmin/profile" element={<ProtectedRoute role="superadmin"><SuperAdminProfile /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/institute/coding/create" element={<CreateCodingExam />} />
        <Route path="/student/coding/:id" element={<TakeCodingExam />} />

        <Route path="*" element={<Navigate to={getHome()} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;