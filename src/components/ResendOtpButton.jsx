import { useState, useEffect } from 'react';
import { resendOtp } from '../api/auth';
import { getErrorMessage } from '../utils/getErrorMessage';

const ResendOtpButton = ({ phone, onResend }) => {
  const [cooldown, setCooldown] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendMsg, setResendMsg] = useState(null);
  const [resendError, setResendError] = useState(null);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!phone || cooldown > 0 || isSubmitting) return;

    setIsSubmitting(true);
    setResendMsg(null);
    setResendError(null);

    try {
      const res = await resendOtp({ phone });
      setCooldown(30);
      
      const successText = res?.otp
        ? `New OTP sent successfully! (Dev Code: ${res.otp})`
        : res?.message || 'New OTP has been sent to your phone.';
      
      setResendMsg(successText);
      if (onResend) onResend(res);
    } catch (err) {
      setResendError(getErrorMessage(err, 'Failed to resend OTP code.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="resend-otp-wrapper" style={{ marginTop: '12px', textAlign: 'center' }}>
      <button
        type="button"
        className="btn btn-secondary btn-block"
        onClick={handleResend}
        disabled={cooldown > 0 || isSubmitting || !phone}
      >
        {isSubmitting ? (
          <span className="btn-loading flex-center">
            <span className="spinner-mini"></span> Sending Code...
          </span>
        ) : cooldown > 0 ? (
          `Resend OTP Code (${cooldown}s)`
        ) : (
          'Resend OTP Code'
        )}
      </button>

      {resendMsg && (
        <div className="alert alert-warning mt-2 mb-0" style={{ padding: '8px 12px', fontSize: '0.8rem', marginTop: '8px' }}>
          <span>{resendMsg}</span>
        </div>
      )}

      {resendError && (
        <div className="alert alert-danger mt-2 mb-0" style={{ padding: '8px 12px', fontSize: '0.8rem', marginTop: '8px' }}>
          <span>{resendError}</span>
        </div>
      )}
    </div>
  );
};

export default ResendOtpButton;
