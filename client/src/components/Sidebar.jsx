import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const Sidebar = ({ onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const superadminLinks = [
    { to: '/super/dashboard',  icon: '🏠', label: 'Dashboard' },
    { to: '/super/institutes', icon: '🏫', label: 'Manage Institutes' },
    { to: '/profile',          icon: '👤', label: 'Profile' },
    { to: '/settings',         icon: '⚙️', label: 'Settings' },
  ];

  const instituteLinks = [
    { to: '/institute/dashboard', icon: '🏠', label: 'Dashboard' },
    { to: '/institute/students',  icon: '👨‍🎓', label: 'Students' },
    { to: '/institute/questions', icon: '📝', label: 'Question Bank' },
    { to: '/institute/exams',     icon: '📋', label: 'Manage Exams' },
    { to: '/institute/coding/create', icon: '💻', label: 'Coding Exam' },
    { to: '/institute/results',   icon: '📊', label: 'Results' },
    { to: '/profile',             icon: '👤', label: 'Profile' },
    { to: '/settings',            icon: '⚙️', label: 'Settings' },
  ];

  const studentLinks = [
    { to: '/student/dashboard',   icon: '🏠', label: 'Dashboard' },
    { to: '/student/results',     icon: '📊', label: 'My Results' },
    { to: '/student/leaderboard', icon: '🏆', label: 'Leaderboard' },
    { to: '/profile',             icon: '👤', label: 'Profile' },
    { to: '/settings',            icon: '⚙️', label: 'Settings' },
  ];

  const links =
    user?.role === 'superadmin' ? superadminLinks :
    user?.role === 'institute'  ? instituteLinks  : studentLinks;

  return (
    <aside className="w-64 bg-blue-900 text-white flex flex-col sticky top-0 h-screen overflow-hidden">

      {/* Logo */}
      <div className="p-5 border-b border-blue-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">📚 ExamPlatform</h1>
            <p className="text-blue-300 text-xs mt-0.5 capitalize">{user?.role}</p>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === 'student' && <NotificationBell />}
            {onClose && (
              <button
                onClick={onClose}
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-800 transition"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 2l12 12M14 2L2 14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Nav Links — scroll hoga sirf yahan */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map(link => (
          <Link
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition text-sm font-medium ${
              location.pathname === link.to
                ? 'bg-blue-700 text-white'
                : 'text-blue-200 hover:bg-blue-800 hover:text-white'
            }`}
          >
            <span>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>

      {/* User Info + Logout — hamesha neeche fixed */}
      <div className="p-4 border-t border-blue-800 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-blue-300 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition"
        >
          🚪 Logout
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;