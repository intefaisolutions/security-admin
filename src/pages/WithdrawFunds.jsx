import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { deductAdminWalletFunds } from "../api/admin";
import { getErrorMessage } from "../utils/getErrorMessage";

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const WithdrawFunds = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const balance = user?.wallet?.balance || 0;
  const currency = user?.wallet?.currency || "INR";

  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (withdrawAmount > balance) {
      setError("Withdrawal amount cannot exceed your available balance.");
      return;
    }
    if (!accountNumber.trim() || accountNumber.trim().length < 6) {
      setError("Please enter a valid account number.");
      return;
    }
    if (!IFSC_REGEX.test(ifscCode.trim().toUpperCase())) {
      setError("Please enter a valid IFSC code (e.g. HDFC0001234).");
      return;
    }
    if (!bankName.trim()) {
      setError("Please enter the bank name.");
      return;
    }

    setIsProcessing(true);
    try {
      const id = user?._id || user?.id;
      const updatedAdmin = await deductAdminWalletFunds(id, withdrawAmount);
      updateUser({ wallet: updatedAdmin.wallet });
      navigate("/wallets");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to process withdrawal."));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Withdraw Funds</h1>
      </div>

      <div className="card-box" style={{ maxWidth: "520px", padding: "28px" }}>
        <div className="form-group mb-4">
          <label>Available Balance</label>
          <div className="form-value" style={{ fontWeight: 700, color: "var(--primary)" }}>
            {currency} {balance.toLocaleString()}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-danger mb-4">
              <span>{error}</span>
            </div>
          )}

          <div className="form-group mb-4">
            <label>Amount to Withdraw</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              placeholder="Enter amount"
            />
          </div>

          <div className="form-group mb-4">
            <label>Account Number</label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              required
              placeholder="Enter bank account number"
            />
          </div>

          <div className="form-group mb-4">
            <label>IFSC Code</label>
            <input
              type="text"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              required
              placeholder="e.g. HDFC0001234"
              maxLength={11}
            />
          </div>

          <div className="form-group mb-4">
            <label>Bank Name</label>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              required
              placeholder="Enter bank name"
            />
          </div>

          <div className="action-buttons-group" style={{ marginTop: "20px" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate("/wallets")}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Withdraw"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WithdrawFunds;