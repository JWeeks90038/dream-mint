import { useState, useEffect } from 'react';
import { environment, fetchBackendConfig } from '../config/environment';

interface PaymentMethod {
  id: string;
  type: 'crypto' | 'stripe';
  cryptoAddress?: string;
  stripePaymentMethodId?: string;
  last4?: string;
  brand?: string;
  isDefault: boolean;
}

interface PaymentManagerProps {
  account: string;
  onPaymentMethodSelected: (method: PaymentMethod) => void;
  onClose: () => void;
}

export function PaymentManager({ account, onPaymentMethodSelected, onClose }: PaymentManagerProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPaymentMethods();
    // Initialize environment config
    fetchBackendConfig();
  }, [account]);

  const loadPaymentMethods = async () => {
    try {
      // Load saved payment methods from localStorage and backend
      const savedMethods = localStorage.getItem(`payment_methods_${account}`);
      if (savedMethods) {
        const methods = JSON.parse(savedMethods);
        setPaymentMethods(methods);
        
        // Set default method if exists
        const defaultMethod = methods.find((m: PaymentMethod) => m.isDefault);
        if (defaultMethod) {
          setSelectedMethod(defaultMethod);
        }
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const addCryptoPayment = async () => {
    if (!account) return;
    
    const cryptoMethod: PaymentMethod = {
      id: `crypto_${Date.now()}`,
      type: 'crypto',
      cryptoAddress: account,
      isDefault: paymentMethods.length === 0
    };

    const updatedMethods = [...paymentMethods, cryptoMethod];
    setPaymentMethods(updatedMethods);
    localStorage.setItem(`payment_methods_${account}`, JSON.stringify(updatedMethods));
    setSelectedMethod(cryptoMethod);
  };

  const addStripePayment = async (cardData: any) => {
    setLoading(true);
    console.log('🔄 Adding Stripe payment method...', { 
      cardNumber: cardData.number.replace(/\d(?=\d{4})/g, "*"), // Mask card number for logging
      expMonth: cardData.exp_month,
      expYear: cardData.exp_year,
      name: cardData.name 
    });
    
    try {
      // Check if we're in live mode
      if (environment.stripe.isLiveMode) {
        // In live mode, we should use Stripe Elements (not implemented yet)
        alert('🔴 Live mode detected!\n\nFor production, this would use Stripe Elements for secure card processing.\n\nCurrently using test mode flow for demonstration.');
      }
      
      // Always create real Stripe payment method via backend (even for test cards)
      console.log('📤 Sending request to backend...');
      const response = await fetch(`${environment.apiUrl}/api/create-payment-method`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account,
          cardNumber: cardData.number,
          expMonth: cardData.exp_month,
          expYear: cardData.exp_year,
          cvc: cardData.cvc,
          name: cardData.name
        })
      });

      console.log('📥 Backend response status:', response.status);
      const result = await response.json();
      console.log('📥 Backend response data:', result);
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      const stripeMethod: PaymentMethod = {
        id: `stripe_${Date.now()}`,
        type: 'stripe',
        stripePaymentMethodId: result.paymentMethodId,
        last4: result.last4 || cardData.number.slice(-4),
        brand: result.brand || 'card',
        isDefault: paymentMethods.length === 0
      };

      const updatedMethods = [...paymentMethods, stripeMethod];
      setPaymentMethods(updatedMethods);
      localStorage.setItem(`payment_methods_${account}`, JSON.stringify(updatedMethods));
      setSelectedMethod(stripeMethod);
      setShowAddMethod(false);
      
      console.log('✅ Payment method added successfully:', {
        paymentMethodId: result.paymentMethodId,
        customerId: result.customerId,
        last4: result.last4,
        brand: result.brand
      });
      
      const isTestCard = cardData.number === '4242424242424242';
      alert(`✅ ${isTestCard ? 'Test card' : 'Card'} added successfully!\nPayment Method ID: ${result.paymentMethodId}\nCustomer ID: ${result.customerId}\nLast 4: ${result.last4}\nBrand: ${result.brand}${isTestCard ? '\n\n🔄 You can now generate images and mint NFTs multiple times with this card!' : ''}`);
      
    } catch (error) {
      console.error('❌ Error adding Stripe payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Failed to add payment method: ${errorMessage}\n\nTry using the test card: 4242 4242 4242 4242`);
    } finally {
      setLoading(false);
    }
  };

  const setDefaultMethod = (method: PaymentMethod) => {
    const updatedMethods = paymentMethods.map(m => ({
      ...m,
      isDefault: m.id === method.id
    }));
    setPaymentMethods(updatedMethods);
    localStorage.setItem(`payment_methods_${account}`, JSON.stringify(updatedMethods));
    setSelectedMethod(method);
  };

  const removePaymentMethod = (methodId: string) => {
    const updatedMethods = paymentMethods.filter(m => m.id !== methodId);
    setPaymentMethods(updatedMethods);
    localStorage.setItem(`payment_methods_${account}`, JSON.stringify(updatedMethods));
    
    if (selectedMethod?.id === methodId) {
      setSelectedMethod(updatedMethods.find(m => m.isDefault) || null);
    }
  };

  return (
    <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>💳 Payment Methods</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>×</button>
        </div>

        {/* Environment Mode Notice */}
        <div style={{ 
          background: environment.stripe.isLiveMode ? '#ffebee' : '#e3f2fd', 
          border: `1px solid ${environment.stripe.isLiveMode ? '#f44336' : '#2196f3'}`, 
          borderRadius: '8px', 
          padding: '12px', 
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <strong>{environment.stripe.isLiveMode ? '🔴 LIVE MODE' : '🧪 TEST MODE'}:</strong>{' '}
          {environment.stripe.isLiveMode ? (
            <span>
              Real payments will be processed. Use actual payment cards.
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#d32f2f' }}>
                <strong>⚠️ Production mode - real money will be charged!</strong>
              </div>
            </span>
          ) : (
            <span>
              Use these Stripe test cards for testing:
              <div style={{ marginTop: '8px', fontSize: '12px', fontFamily: 'monospace' }}>
                <div>• <strong>4242 4242 4242 4242</strong> - Visa (always succeeds)</div>
                <div>• <strong>4000 0566 5566 5556</strong> - Visa Debit</div>
                <div>• <strong>5555 5555 5555 4444</strong> - Mastercard</div>
                <div style={{ marginTop: '4px', color: '#666' }}>Use any future date and any 3-digit CVC</div>
              </div>
            </span>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Current Payment Methods</h3>
          {paymentMethods.length === 0 ? (
            <p style={{ color: '#666' }}>No payment methods added yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {paymentMethods.map(method => (
                <div key={method.id} style={{
                  border: selectedMethod?.id === method.id ? '2px solid #4CAF50' : '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="radio"
                      checked={selectedMethod?.id === method.id}
                      onChange={() => setSelectedMethod(method)}
                    />
                    <div>
                      {method.type === 'crypto' ? (
                        <div>
                          <strong>🔗 Solana</strong>
                          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>
                            {method.cryptoAddress?.slice(0, 6)}...{method.cryptoAddress?.slice(-4)}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <strong>💳 {method.brand?.toUpperCase()} •••• {method.last4}</strong>
                          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Credit/Debit Card</p>
                        </div>
                      )}
                      {method.isDefault && (
                        <span style={{ fontSize: '10px', color: '#4CAF50', fontWeight: 'bold' }}>DEFAULT</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!method.isDefault && (
                      <button
                        onClick={() => setDefaultMethod(method)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => removePaymentMethod(method.id)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Add New Payment Method</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button
              onClick={addCryptoPayment}
              disabled={paymentMethods.some(m => m.type === 'crypto')}
              style={{
                padding: '10px 20px',
                backgroundColor: paymentMethods.some(m => m.type === 'crypto') ? '#ccc' : '#FF9800',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: paymentMethods.some(m => m.type === 'crypto') ? 'not-allowed' : 'pointer'
              }}
            >
              🔗 Add Solana Wallet
            </button>
            <button
              onClick={() => setShowAddMethod(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              💳 Add Credit/Debit Card
            </button>
          </div>
        </div>

        {showAddMethod && (
          <StripeCardForm
            onSubmit={addStripePayment}
            onCancel={() => setShowAddMethod(false)}
            loading={loading}
          />
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ccc',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => selectedMethod && onPaymentMethodSelected(selectedMethod)}
            disabled={!selectedMethod}
            style={{
              padding: '10px 20px',
              backgroundColor: selectedMethod ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: selectedMethod ? 'pointer' : 'not-allowed'
            }}
          >
            Use Selected Method
          </button>
        </div>
      </div>
    </div>
  );
}

interface StripeCardFormProps {
  onSubmit: (cardData: any) => void;
  onCancel: () => void;
  loading: boolean;
}

function StripeCardForm({ onSubmit, onCancel, loading }: StripeCardFormProps) {
  const [cardData, setCardData] = useState({
    number: '',
    exp_month: '',
    exp_year: '',
    cvc: '',
    name: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(cardData);
  };

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '20px',
      backgroundColor: '#f9f9f9',
      marginBottom: '20px'
    }}>
      <h4>Add Credit/Debit Card</h4>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Cardholder Name
          </label>
          <input
            type="text"
            value={cardData.name}
            onChange={(e) => setCardData({...cardData, name: e.target.value})}
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Card Number
          </label>
          <input
            type="text"
            value={cardData.number}
            onChange={(e) => setCardData({...cardData, number: e.target.value.replace(/\s/g, '')})}
            placeholder="1234 5678 9012 3456"
            maxLength={16}
            required
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Exp Month
            </label>
            <input
              type="text"
              value={cardData.exp_month}
              onChange={(e) => setCardData({...cardData, exp_month: e.target.value})}
              placeholder="MM"
              maxLength={2}
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Exp Year
            </label>
            <input
              type="text"
              value={cardData.exp_year}
              onChange={(e) => setCardData({...cardData, exp_year: e.target.value})}
              placeholder="YY"
              maxLength={2}
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              CVC
            </label>
            <input
              type="text"
              value={cardData.cvc}
              onChange={(e) => setCardData({...cardData, cvc: e.target.value})}
              placeholder="123"
              maxLength={4}
              required
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ccc',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: loading ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Adding...' : 'Add Card'}
          </button>
        </div>
      </form>
    </div>
  );
}
