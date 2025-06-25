import React from "react";

interface PaymentOptionsModalProps {
  open: boolean;
  onClose: () => void;
  onCrypto: () => void;
  onCard: () => void;
  loading?: boolean;
}

const PaymentOptionsModal: React.FC<PaymentOptionsModalProps> = ({ open, onClose, onCrypto, onCard, loading }) => {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, minWidth: 320, boxShadow: '0 2px 16px #0003', textAlign: 'center' }}>
        <h2>Choose Payment Method</h2>
        <button
          className="dream-action-btn"
          onClick={onCrypto}
          disabled={loading}
          style={{ margin: 12, minWidth: 180 }}
        >
          Pay with Crypto
        </button>
        <button
          className="dream-action-btn"
          onClick={onCard}
          disabled={loading}
          style={{ margin: 12, minWidth: 180 }}
        >
          Pay with Card
        </button>
        <div style={{ marginTop: 18 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 16, cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default PaymentOptionsModal;
