const LoadingSpinner = ({ size = 'medium', text = 'Loading data...' }) => {
  return (
    <div className={`loading-spinner-container ${size}`}>
      <div className="spinner-ring"></div>
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
