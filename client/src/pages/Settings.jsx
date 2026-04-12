// import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import toast from 'react-hot-toast';

const Settings = () => {
  const { darkMode, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  return (
    <div className={`flex min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Layout />
      <main className="flex-1 p-8">
        <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          ⚙️ Settings
        </h2>

        <div className="max-w-2xl space-y-6">

          {/* Appearance */}
          <div className={`rounded-xl shadow p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              🎨 Appearance
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                  {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
                </p>
              </div>

              {/* Toggle Switch */}
              <button onClick={toggleTheme}
                className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                  darkMode ? 'bg-blue-600' : 'bg-gray-300'
                }`}>
                <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all duration-300 ${
                  darkMode ? 'left-7' : 'left-0.5'
                }`}></div>
              </button>
            </div>

            {/* Preview */}
            <div className={`mt-4 rounded-xl p-4 border-2 ${
              darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                Preview
              </p>
              <div className="flex gap-2 mt-2">
                <div className={`flex-1 h-8 rounded-lg ${darkMode ? 'bg-gray-600' : 'bg-white shadow'}`}></div>
                <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className={`rounded-xl shadow p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              🔔 Notifications
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                    Exam Notifications
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Get notified when new exam is assigned
                  </p>
                </div>
                <button onClick={() => {
                  setNotifications(!notifications);
                  toast.success(notifications ? 'Notifications disabled' : 'Notifications enabled');
                }}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                    notifications ? 'bg-blue-600' : 'bg-gray-300'
                  }`}>
                  <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all duration-300 ${
                    notifications ? 'left-7' : 'left-0.5'
                  }`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                    Email Alerts
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Receive result updates on email
                  </p>
                </div>
                <button onClick={() => {
                  setEmailAlerts(!emailAlerts);
                  toast.success(emailAlerts ? 'Email alerts disabled' : 'Email alerts enabled');
                }}
                  className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                    emailAlerts ? 'bg-blue-600' : 'bg-gray-300'
                  }`}>
                  <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all duration-300 ${
                    emailAlerts ? 'left-7' : 'left-0.5'
                  }`}></div>
                </button>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className={`rounded-xl shadow p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              👤 Account Info
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Name</span>
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{user?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email</span>
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Role</span>
                <span className={`text-sm font-medium capitalize ${darkMode ? 'text-white' : 'text-gray-800'}`}>{user?.role}</span>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className={`rounded-xl shadow p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h3 className={`font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              🆘 Support
            </h3>
            <div className="space-y-3">
              <div className={`flex items-center gap-3 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <span className="text-2xl">📞</span>
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-700'}`}>Helpline</p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>+91 98765 43210</p>
                </div>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <span className="text-2xl">📧</span>
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-700'}`}>Email Support</p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>support@examplatform.com</p>
                </div>
              </div>
              <div className={`flex items-center gap-3 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <span className="text-2xl">🌐</span>
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-700'}`}>Version</p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>ExamPlatform v1.0.0</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default Settings;