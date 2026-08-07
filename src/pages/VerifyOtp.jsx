import { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { verifyOtp } from '../api/auth';
import { getErrorMessage } from '../utils/getErrorMessage';
import ResendOtpButton from '../components/ResendOtpButton';

const VerifyOtp = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const phone = location.state?.phone || '';
  const otpHint = location.state?.otpHint;

  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!otp.trim() || otp.trim().length !== 6) {
      setErrorMsg('Please enter a valid 6-digit OTP code.');
      return;
    }

    setIsSubmitting(true);

    try {
      await verifyOtp({ phone, otp: otp.trim() });
      // On success, redirect to login page with verified state flag
      navigate('/login', { state: { verified: true } });
    } catch (err) {
      setErrorMsg(getErrorMessage(err, 'OTP verification failed. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Missing phone fallback if user navigated directly to /verify-otp
  if (!phone) {
    return (
      <div className="login-page">
        <div className="login-container">
          <div className="login-card" style={{ textAlign: 'center' }}>
            <div className="login-header">
              <div className="login-brand-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h2>Phone Number Required</h2>
              <p className="login-subtitle">
                No phone number found for OTP verification. Please sign up or request a password reset first.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <Link to="/signup" className="btn btn-primary btn-block">
                Go to Sign Up
              </Link>
              <Link to="/forgot-password" className="btn btn-secondary btn-block">
                Go to Forgot Password
              </Link>
              <Link to="/login" className="stat-link" style={{ marginTop: '8px' }}>
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-brand-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h2>Verify Phone Number</h2>
            <p className="login-subtitle">
              Enter 6-digit OTP code sent to <strong>{phone}</strong>
            </p>
          </div>

          {otpHint && (
            <div className="alert alert-warning" style={{ fontSize: '0.85rem' }}>
              <span>Development Code Hint: <strong>{otpHint}</strong></span>
            </div>
          )}

          {errorMsg && (
            <div className="alert alert-danger" role="alert">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleVerify} className="login-form">
            <div className="form-group">
              <label htmlFor="otp">6-Digit Verification Code</label>
              <div className="input-with-icon">
                <span className="input-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
                <input
                  id="otp"
                  type="text"
                  maxLength={6}
                  placeholder="e.g. 123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={isSubmitting}
                  style={{ letterSpacing: '4px', fontSize: '1.1rem', fontWeight: 'bold' }}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={isSubmitting || otp.length !== 6}
            >
              {isSubmitting ? (
                <span className="btn-loading flex-center">
                  <span className="spinner-mini"></span> Verifying Code...
                </span>
              ) : (
                'Verify & Activate Account'
              )}
            </button>
          </form>

          {/* Resend OTP Component */}
          <ResendOtpButton phone={phone} />

          <div className="login-footer" style={{ marginTop: '16px' }}>
            <Link to="/login" className="stat-link">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
