import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { addAdminWalletFunds } from "../api/admin";
import { getErrorMessage } from "../utils/getErrorMessage";

const Wallets = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const balance = user?.wallet?.balance || 0;
  const currency = user?.wallet?.currency || "INR";

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [addError, setAddError] = useState(null);

  const handleAddFunds = async (e) => {
    e.preventDefault();
    const amount = Number(addAmount);
    if (!amount || amount <= 0) {
      setAddError("Please enter a valid amount.");
      return;
    }

    setAddError(null);
    setIsProcessing(true);
    try {
      const id = user?._id || user?.id;
      const updatedAdmin = await addAdminWalletFunds(id, amount);
      updateUser({ wallet: updatedAdmin.wallet });
      setIsAddModalOpen(false);
      setAddAmount("");
    } catch (err) {
      setAddError(getErrorMessage(err, "Failed to add funds."));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Wallet</h1>
      </div>

      <div
        className="card-box"
        style={{ maxWidth: "420px", textAlign: "center", padding: "32px" }}
      >
        <div
          className="text-muted"
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Available Balance
        </div>
        <div
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            color: "var(--primary)",
            margin: "8px 0",
          }}
        >
          {currency} {balance.toLocaleString()}
        </div>
        <div
          className="action-buttons-group"
          style={{ justifyContent: "center", marginTop: "16px" }}
        >
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            Add Money
          </button>
          <button className="btn btn-outline" onClick={() => navigate("/wallets/withdraw")}>
            Withdraw
          </button>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "420px" }}
          >
            <div className="modal-header">
              <h3>Add Money</h3>
              <button className="icon-btn-close" onClick={() => setIsAddModalOpen(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleAddFunds}>
              <div className="modal-body">
                {addError && (
                  <div className="alert alert-danger mb-4">
                    <span>{addError}</span>
                  </div>
                )}
                <div className="form-group mb-4">
                  <label>Amount to Add</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    required
                    placeholder="Enter amount"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isProcessing}>
                  {isProcessing ? "Processing..." : "Add Funds"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wallets;