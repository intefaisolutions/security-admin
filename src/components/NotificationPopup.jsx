import { useSocket } from '../context/SocketContext';

const NotificationPopup = () => {
  const { notifications, dismissNotification } = useSocket();

  if (!notifications || notifications.length === 0) return null;

  return (
    <div
      className="notification-toast-container"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '360px',
        width: '100%',
      }}
    >
      {notifications.map((item) => (
        <div
          key={item.id}
          className="alert alert-warning"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--primary-color)',
            color: 'var(--text-main)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            margin: 0,
            padding: '14px 16px',
            borderRadius: '8px',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary-color)', marginBottom: '4px' }}>
              ⚡ {item.title}
            </div>
            <div style={{ fontSize: '0.85rem' }}>{item.text}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{item.time}</div>
          </div>
          <button
            onClick={() => dismissNotification(item.id)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '1.2rem',
              lineHeight: 1,
              padding: '0 4px',
            }}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationPopup;
