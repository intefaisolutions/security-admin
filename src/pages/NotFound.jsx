import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-code">404</div>
        <h2>Page Not Found</h2>
        <p className="text-muted">
          The page or resource you are looking for does not exist or has been moved.
        </p>
        <div className="not-found-actions">
          <Link to="/dashboard" className="btn btn-primary">
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
