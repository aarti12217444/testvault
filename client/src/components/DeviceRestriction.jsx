import { useEffect, useState } from 'react';

const DeviceRestriction = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      // Phones generally have a small screen and coarse pointer.
      const phone = window.matchMedia(
        '(max-width: 767px) and (pointer: coarse)'
      ).matches;

      setIsMobile(phone);
    };

    checkDevice();

    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center
        bg-slate-100 p-6 text-center">
        <div className="max-w-md rounded-2xl bg-white p-8 shadow-lg">
          <div className="mb-4 text-5xl">💻</div>

          <h1 className="text-2xl font-bold text-slate-900">
            Device Not Supported
          </h1>

          <p className="mt-3 text-slate-600 leading-6">
            TakeExam is available only on laptops, desktops, and tablets.
            Please open this website on a supported device to continue
            your examination.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default DeviceRestriction;
