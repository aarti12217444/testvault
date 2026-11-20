
import { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const { data } = await API.get('/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  const markAllRead = async () => {
    try {
      await API.put('/notifications/read-all');

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  const markRead = async (id, link) => {
    const notification = notifications.find((item) => item._id === id);

    try {
      if (!notification?.isRead) {
        await API.put(`/notifications/${id}/read`);

        setNotifications((previous) =>
          previous.map((item) =>
            item._id === id ? { ...item, isRead: true } : item
          )
        );
      }

      setOpen(false);

      if (link) navigate(link);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const getIcon = (type) => {
    if (type === 'exam') return '📝';
    if (type === 'result') return '🎉';
    if (type === 'expiry') return '⚠️';
    if (type === 'message') return '💬';
    return '🔔';
  };

  const timeAgo = (date) => {
    const seconds = Math.max(
      0,
      Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    );

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div ref={dropdownRef} className="relative z-[100]">
      {/* Notification Bell */}
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        className="relative flex h-12 w-12 items-center justify-center
          rounded-full bg-blue-800/70 text-white transition
          hover:bg-blue-700 focus:outline-none focus:ring-2
          focus:ring-blue-300"
      >
        <span className="text-2xl">🔔</span>

        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-6 min-w-6
              items-center justify-center rounded-full border-2
              border-blue-800 bg-red-500 px-1 text-xs font-bold text-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {open && (
        <div
          className="
            fixed left-3 right-3 top-20
            z-[9999] flex max-h-[min(75vh,600px)] flex-col
            overflow-hidden rounded-2xl border border-slate-200
            bg-white text-left shadow-2xl
            sm:left-auto sm:right-4 sm:top-20 sm:w-[380px]
            md:right-6
          "
          role="dialog"
          aria-label="Notifications"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-3
            border-b border-slate-200 bg-white px-4 py-4">

            <div className="flex min-w-0 items-center gap-2">
              <span className="text-xl">🔔</span>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Notifications
                </h3>

                <p className="text-xs text-slate-500">
                  {unreadCount > 0
                    ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                    : 'You are all caught up'}
                </p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="shrink-0 rounded-lg px-2 py-2 text-xs
                  font-semibold text-blue-600 transition
                  hover:bg-blue-50 hover:text-blue-800"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {notifications.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="mb-3 text-4xl">🔕</div>
                <p className="font-semibold text-slate-700">
                  No notifications yet
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  New updates will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification._id}
                    onClick={() =>
                      markRead(notification._id, notification.link)
                    }
                    className={`flex w-full items-start gap-3 px-4 py-4
                      text-left transition hover:bg-slate-50
                      focus:outline-none focus:bg-blue-50
                      ${
                        !notification.isRead
                          ? 'bg-blue-50/70'
                          : 'bg-white'
                      }`}
                  >
                    {/* Icon */}
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center
                        justify-center rounded-xl text-xl
                        ${
                          !notification.isRead
                            ? 'bg-blue-100'
                            : 'bg-slate-100'
                        }`}
                    >
                      {getIcon(notification.type)}
                    </span>

                    {/* Content */}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span
                          className={`break-words text-sm leading-5
                            ${
                              !notification.isRead
                                ? 'font-bold text-slate-900'
                                : 'font-medium text-slate-700'
                            }`}
                        >
                          {notification.title}
                        </span>

                        {!notification.isRead && (
                          <span className="mt-1.5 h-2 w-2 shrink-0
                            rounded-full bg-blue-600" />
                        )}
                      </span>

                      <span className="mt-1 block break-words text-sm
                        leading-5 text-slate-600">
                        {notification.message}
                      </span>

                      <span className="mt-2 block text-xs text-slate-400">
                        {timeAgo(notification.createdAt)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="shrink-0 border-t border-slate-200
              bg-slate-50 px-4 py-3 text-center">
              <p className="text-xs font-medium text-slate-500">
                Showing {notifications.length} notification
                {notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
