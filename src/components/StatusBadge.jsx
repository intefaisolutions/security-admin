const StatusBadge = ({ status }) => {
  if (!status) return null;

  const normalized = String(status).toLowerCase();
  
  let variant = 'default';
  if (['active', 'approved', 'verified', 'available', 'on duty'].includes(normalized)) {
    variant = 'success';
  } else if (['pending', 'in review', 'backend-pending'].includes(normalized)) {
    variant = 'warning';
  } else if (['inactive', 'suspended', 'rejected', 'off duty', 'deleted'].includes(normalized)) {
    variant = 'danger';
  } else if (['day', 'night', 'shift'].includes(normalized)) {
    variant = 'info';
  }

  return (
    <span className={`status-badge badge-${variant}`}>
      <span className="badge-dot"></span>
      {status}
    </span>
  );
};

export default StatusBadge;
