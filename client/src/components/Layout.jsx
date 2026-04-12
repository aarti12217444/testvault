import { useState } from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* ── Desktop Sidebar — hamesha visible ── */}
      <div className="hidden md:flex md:w-64 md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* ── Mobile Sidebar — toggle pe aata hai ── */}
      <>
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <div
          className={`
            fixed top-0 left-0 h-screen w-64 z-30 md:hidden
            transition-transform duration-300 ease-in-out
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <Sidebar onClose={() => setMobileOpen(false)} />
        </div>
      </>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar — sirf mobile pe dikhta hai */}
        <header className="md:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg hover:bg-gray-100 transition"
            aria-label="Open menu"
          >
            <span className="w-5 h-0.5 bg-gray-600 rounded-full" />
            <span className="w-5 h-0.5 bg-gray-600 rounded-full" />
            <span className="w-5 h-0.5 bg-gray-600 rounded-full" />
          </button>
          <span className="text-sm font-semibold text-gray-700">📚 ExamPlatform</span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>

    </div>
  );
};

export default Layout;