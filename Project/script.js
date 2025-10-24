import React, { useState, useEffect, useCallback } from 'react';
import { Lock, LogIn, UserPlus, Send, Settings, User, DollarSign, Send as SendIcon, Zap, MapPin, Banknote, Landmark, Wallet as WalletIcon, CornerUpRight, CreditCard, ChevronLeft } from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, addDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';

// Global variables provided by the environment (MUST be used)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Helper to construct the path for public, shared data
const getPublicCollectionPath = (collectionName) => {
    return `artifacts/${appId}/public/data/${collectionName}`;
};

// --- SkillPostForm Component (UPDATED to use Firestore) ---
const SkillPostForm = ({ db, userId }) => {
  const [skillToTeach, setSkillToTeach] = useState('');
  const [skillToLearn, setSkillToLearn] = useState('');
  
  const handlePost = async (e) => {
    e.preventDefault();
    if (!skillToTeach || !skillToLearn) {
      alert('Please specify both skills.');
      return;
    }
    
    try {
        const offersRef = collection(db, getPublicCollectionPath('offers'));
        await addDoc(offersRef, {
            teach: skillToTeach,
            learn: skillToLearn,
            userId: userId,
            location: 'Remote/Global', // Default location
            timestamp: new Date().toISOString(),
        });

        alert(`Successfully posted skill swap offer!`);
        
        // Reset form
        setSkillToTeach('');
        setSkillToLearn('');
    } catch (error) {
        console.error("Error posting document: ", error);
        alert(`Failed to post offer: ${error.message}`);
    }
  };
    
  // Custom alert/modal instead of native alert for better UX
  const alert = (message) => {
      const modal = document.getElementById('form-status-modal');
      if (modal) {
          modal.textContent = message;
          modal.classList.remove('hidden');
          // Add temporary styling based on success/error
          if (message.includes('Successfully')) {
              modal.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-indigo-500 text-white p-3 rounded-lg shadow-2xl z-50 transition-opacity duration-300';
          } else {
              modal.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white p-3 rounded-lg shadow-2xl z-50 transition-opacity duration-300';
          }
          setTimeout(() => modal.classList.add('hidden'), 3000);
      }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-indigo-100 mb-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Post Your Offer</h3>
      
      <form onSubmit={handlePost}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">I Want to Teach:</label>
            <input
              type="text"
              placeholder="e.g., Python Programming"
              value={skillToTeach}
              onChange={(e) => setSkillToTeach(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">I Want to Learn:</label>
            <input
              type="text"
              placeholder="e.g., Digital Marketing"
              value={skillToLearn}
              onChange={(e) => setSkillToLearn(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center p-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold shadow-md transition-all duration-200 active:scale-[0.98]"
        >
          Post Skill Swap
        </button>
      </form>

      {/* Form Status Modal */}
      <div id="form-status-modal" className="hidden fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white p-3 rounded-lg shadow-2xl z-50 transition-opacity duration-300">
        Status Message
      </div>
    </div>
  );
};

// --- LiveOffersList Component (UPDATED to use Firestore) ---
const LiveOffersList = ({ db, userId }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch live offers using onSnapshot
  useEffect(() => {
    if (!db) return;

    setLoading(true);
    
    try {
        const offersCol = collection(db, getPublicCollectionPath('offers'));
        const q = query(offersCol);
        
        // Listen for real-time updates
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const liveOffers = [];
            snapshot.forEach(doc => {
                liveOffers.push({ id: doc.id, ...doc.data() });
            });
            // Sort by timestamp if available, otherwise reverse to show latest first
            liveOffers.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
            setOffers(liveOffers);
            setLoading(false);
        }, (error) => {
            console.error("Error listening to live offers:", error);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    } catch (error) {
        console.error("Firestore setup error:", error);
        setLoading(false);
    }
  }, [db]); // Re-run effect if DB instance changes

  const handleDelete = async (id) => {
    if (!db || !window.confirm("Are you sure you want to delete this offer?")) return;
    try {
        const docRef = doc(db, getPublicCollectionPath('offers'), id);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting document: ", error);
        // Use the custom alert mechanism from SkillPostForm if you want a global message
    }
  };

  if (loading) {
    return (
      <div className="text-center py-10 text-indigo-500">
        <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-indigo-600 mx-auto mb-3"></div>
        <p>Loading live offers...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">Live Skill Swap Offers ({offers.length})</h3>
      
      {offers.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <Zap size={24} className="mx-auto mb-2 text-yellow-500" />
          <p>No offers posted yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {offers.map(offer => (
            <div key={offer.id} className="p-4 border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition duration-150 flex justify-between items-start bg-gray-50">
              <div className='flex-1 pr-4'>
                <p className="font-semibold text-indigo-700">Teach: {offer.teach}</p>
                <p className="text-sm text-gray-600">Learn: <span className="font-medium text-gray-800">{offer.learn}</span></p>
                <p className="text-xs text-gray-400 mt-1">
                    Posted: {offer.timestamp ? new Date(offer.timestamp).toLocaleString() : 'N/A'}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="text-gray-500 flex items-center justify-end">
                    <User size={14} className="mr-1" /> {offer.userId.substring(0, 8)}...
                </p>
                <p className="text-gray-500 flex items-center justify-end mt-1">
                    <MapPin size={14} className="mr-1" /> {offer.location || 'N/A'}
                </p>
                
                {/* Action buttons */}
                <div className="mt-2 space-y-1">
                    {offer.userId === userId ? (
                        <button 
                            onClick={() => handleDelete(offer.id)}
                            className="w-full text-xs font-semibold text-white bg-red-500 px-3 py-1 rounded-full hover:bg-red-600 transition-colors"
                        >
                            Delete
                        </button>
                    ) : (
                        <button className="w-full text-xs font-semibold text-white bg-green-500 px-3 py-1 rounded-full hover:bg-green-600 transition-colors">
                            Swap
                        </button>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Withdrawal Forms Components (Omitted for brevity, assumed unchanged) ---
const BankWithdrawalForm = ({ bankAccount, setBankAccount }) => (
    <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name on Account:</label>
            <input
                type="text"
                value={bankAccount.name}
                onChange={(e) => setBankAccount({ ...bankAccount, name: e.target.value })}
                placeholder="John Doe"
                className="w-full p-3 border border-gray-300 rounded-lg"
            />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name/Code (e.g., IFSC/SWIFT):</label>
                <input
                    type="text"
                    value={bankAccount.bankName}
                    onChange={(e) => setBankAccount({ ...bankAccount, bankName: e.target.value })}
                    placeholder="e.g., CHASUS33 or IFSC"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number (or IBAN):</label>
                <input
                    type="text"
                    value={bankAccount.accountNumber}
                    onChange={(e) => setBankAccount({ ...bankAccount, accountNumber: e.target.value })}
                    placeholder="1234567890"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                />
            </div>
        </div>
    </div>
);

const CryptoWithdrawalForm = ({ cryptoDetails, setCryptoDetails }) => (
    <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Crypto Network/Coin:</label>
            <select
                value={cryptoDetails.network}
                onChange={(e) => setCryptoDetails({ ...cryptoDetails, network: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
            >
                <option value="USDT (Polygon)">USDT (Polygon)</option>
                <option value="ETH (ERC-20)">ETH (ERC-20)</option>
                <option value="BTC (SegWit)">BTC (SegWit)</option>
                <option value="USDC (Solana)">USDC (Solana)</option>
            </select>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Address:</label>
            <input
                type="text"
                value={cryptoDetails.address}
                onChange={(e) => setCryptoDetails({ ...cryptoDetails, address: e.target.value })}
                placeholder="0x..."
                className="w-full p-3 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-red-500 mt-1">Double check the address and network! Funds sent to the wrong network will be lost.</p>
        </div>
    </div>
);

const UPIWithdrawalForm = ({ upiDetails, setUpiDetails }) => (
    <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name (as registered with UPI):</label>
            <input
                type="text"
                value={upiDetails.name}
                onChange={(e) => setUpiDetails({ ...upiDetails, name: e.target.value })}
                placeholder="Jane Doe"
                className="w-full p-3 border border-gray-300 rounded-lg"
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID (VPA):</label>
            <input
                type="text"
                value={upiDetails.upiId}
                onChange={(e) => setUpiDetails({ ...upiDetails, upiId: e.target.value })}
                placeholder="johndoe@bank"
                className="w-full p-3 border border-gray-300 rounded-lg"
            />
        </div>
    </div>
);

const PayPalWithdrawalForm = ({ payPalDetails, setPayPalDetails }) => (
    <div className="space-y-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PayPal Account Email:</label>
            <input
                type="email"
                value={payPalDetails.email}
                onChange={(e) => setPayPalDetails({ ...payPalDetails, email: e.target.value })}
                placeholder="your.email@example.com"
                className="w-full p-3 border border-gray-300 rounded-lg"
            />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name (Optional, for verification):</label>
            <input
                type="text"
                value={payPalDetails.name}
                onChange={(e) => setPayPalDetails({ ...payPalDetails, name: e.target.value })}
                placeholder="Full Name"
                className="w-full p-3 border border-gray-300 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">Withdrawals go directly to this PayPal email address.</p>
        </div>
    </div>
);

// --- WalletAndExchange Component (UPDATED to use live coins) ---
const WalletAndExchange = ({ userData, db, userId, onCoinsChange }) => {
    const EXCHANGE_RATE = 0.05; // 1 SC = $0.05 USD (simulated)
    const [scToExchange, setScToExchange] = useState(0);
    const [withdrawalCurrency, setWithdrawalCurrency] = useState('USD');
    const [withdrawalMethod, setWithdrawalMethod] = useState('bank'); 

    const [bankAccount, setBankAccount] = useState({ name: '', bankName: '', accountNumber: '' });
    const [upiDetails, setUpiDetails] = useState({ upiId: '', name: '' });
    const [cryptoDetails, setCryptoDetails] = useState({ address: '', network: 'USDT (Polygon)' });
    const [payPalDetails, setPayPalDetails] = useState({ email: '', name: '' });
    
    const [withdrawStatus, setWithdrawStatus] = useState('');

    const convertedAmount = (scToExchange * EXCHANGE_RATE).toFixed(2);
    
    const handleExchangeChange = (e) => {
        const value = parseInt(e.target.value) || 0;
        if (value >= 0 && value <= userData.coins) {
            setScToExchange(value);
        } else if (value > userData.coins) {
            setScToExchange(userData.coins);
        } else {
             setScToExchange(0);
        }
    };
    
    const handleWithdrawal = async (e) => {
        e.preventDefault();
        setWithdrawStatus(''); 

        if (scToExchange === 0) {
            setWithdrawStatus('Please enter an amount greater than 0 SC to exchange.');
            return;
        }

        let withdrawalTarget = '';
        let isValid = false;
        let methodLabel = '';

        if (withdrawalMethod === 'bank') {
            isValid = bankAccount.accountNumber && bankAccount.name && bankAccount.bankName;
            withdrawalTarget = `Bank A/C ending in ***${bankAccount.accountNumber.slice(-4)}`;
            methodLabel = 'Bank Account';
        } else if (withdrawalMethod === 'crypto') {
            isValid = cryptoDetails.address && cryptoDetails.network;
            withdrawalTarget = `${cryptoDetails.network} address starting with ${cryptoDetails.address.substring(0, 6)}...`;
            methodLabel = 'Crypto Wallet';
        } else if (withdrawalMethod === 'upi') {
            isValid = upiDetails.upiId && upiDetails.name;
            withdrawalTarget = `UPI ID: ${upiDetails.upiId}`;
            methodLabel = 'UPI/GPay';
        } else if (withdrawalMethod === 'paypal') {
            isValid = payPalDetails.email && payPalDetails.email.includes('@'); 
            withdrawalTarget = `PayPal Email: ${payPalDetails.email}`;
            methodLabel = 'PayPal';
        }

        if (!isValid) {
            setWithdrawStatus(`Please complete all required fields for your ${methodLabel} withdrawal.`);
            return;
        }

        // --- Real Withdrawal Logic using Firestore ---
        try {
            const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile/data`);
            
            // Atomically update coins (simulate transaction logic)
            // NOTE: For simplicity, we are using setDoc here. In a real app, use transaction/batch.
            await setDoc(userDocRef, { coins: userData.coins - scToExchange }, { merge: true });

            setWithdrawStatus(`Processing withdrawal of ${convertedAmount} ${withdrawalCurrency} to ${withdrawalTarget}...`);

            // Simulate success after delay
            setTimeout(() => {
                setWithdrawStatus(`✅ Withdrawal successful! ${convertedAmount} ${withdrawalCurrency} sent to your ${withdrawalMethod} target.`);
                onCoinsChange(userData.coins - scToExchange); // Manually update UI state immediately
                setScToExchange(0);
            }, 3000);
            
        } catch (error) {
            console.error("Withdrawal failed:", error);
            setWithdrawStatus(`❌ Withdrawal failed due to system error: ${error.message}`);
        }
    };

    const withdrawalMethodTabs = [
        { key: 'bank', label: 'Bank Account', icon: Landmark },
        { key: 'crypto', label: 'Crypto Wallet', icon: WalletIcon },
        { key: 'upi', label: 'UPI / GPay', icon: CornerUpRight }, 
        { key: 'paypal', label: 'PayPal', icon: CreditCard }, 
    ];

    const renderForm = () => {
        switch (withdrawalMethod) {
            case 'bank':
                return <BankWithdrawalForm bankAccount={bankAccount} setBankAccount={setBankAccount} />;
            case 'crypto':
                return <CryptoWithdrawalForm cryptoDetails={cryptoDetails} setCryptoDetails={setCryptoDetails} />;
            case 'upi':
                return <UPIWithdrawalForm upiDetails={upiDetails} setUpiDetails={setUpiDetails} />;
            case 'paypal':
                return <PayPalWithdrawalForm payPalDetails={payPalDetails} setPayPalDetails={setPayPalDetails} />;
            default:
                return null;
        }
    };


    return (
        <div className="space-y-6">
            <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <DollarSign size={32} />
                    <h2 className="text-2xl font-bold">Your Skill Swap Wallet</h2>
                </div>
                <div className="text-right">
                    <p className="text-lg font-medium">Total SC Balance:</p>
                    <p className="text-4xl font-extrabold text-yellow-300">{userData.coins} SC</p>
                </div>
            </div>

            {/* Exchange Section */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2 flex items-center">
                    <Banknote size={20} className="mr-2 text-green-600" /> Coin Exchange
                </h3>
                
                <p className="text-sm text-gray-600 mb-4">
                    Current simulated rate: <span className="font-semibold text-green-600">1 SC ≈ ${EXCHANGE_RATE} {withdrawalCurrency}</span>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">SC to Exchange (Max {userData.coins}):</label>
                        <input
                            type="number"
                            value={scToExchange}
                            onChange={handleExchangeChange}
                            max={userData.coins}
                            min="0"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                    <div className="flex items-center justify-center text-xl font-bold text-indigo-600 hidden md:block">
                        <DollarSign size={20} className="inline mr-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Withdrawal Amount:</label>
                        <div className="w-full p-3 bg-indigo-50 text-indigo-700 rounded-lg font-bold border border-indigo-200">
                            {convertedAmount} {withdrawalCurrency}
                        </div>
                    </div>
                </div>

                <div className="text-center mt-6">
                     <p className={`font-semibold ${scToExchange > 0 ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {scToExchange} SC will convert to {convertedAmount} {withdrawalCurrency}.
                    </p>
                </div>
            </div>
            
            {/* Withdrawal Section */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2 flex items-center">
                    Withdrawal Method
                </h3>
                
                {/* Method Tabs */}
                <div className="flex justify-around space-x-2 p-1 bg-gray-50 rounded-lg mb-6">
                    {withdrawalMethodTabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setWithdrawalMethod(tab.key)}
                            className={`flex-1 flex items-center justify-center p-3 rounded-md font-semibold transition-all duration-200
                                ${withdrawalMethod === tab.key
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-gray-700 hover:bg-indigo-100'}`
                            }
                        >
                            <tab.icon size={18} className="mr-2" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {withdrawStatus && (
                    <div className={`p-3 mb-4 rounded-lg font-medium ${withdrawStatus.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {withdrawStatus}
                    </div>
                )}

                <form onSubmit={handleWithdrawal} className="space-y-6">
                    
                    {/* Dynamic Form Content */}
                    {renderForm()}
                    
                    <button
                        type="submit"
                        disabled={scToExchange === 0 || userData.coins < scToExchange}
                        className="w-full flex items-center justify-center p-3 text-white bg-green-600 hover:bg-green-700 rounded-lg font-semibold shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 mt-6"
                    >
                        Confirm Withdrawal of {convertedAmount} {withdrawalCurrency}
                    </button>
                    <p className="text-xs text-gray-500 text-center pt-2">
                        Note: Transactions are processed on a simulated network. Actual withdrawal times may vary based on method.
                    </p>
                </form>
            </div>
        </div>
    );
};


// --- Dashboard Component (UPDATED with Firebase instances) ---
const Dashboard = ({ onLogout, db, auth, userId, userData, onCoinsChange }) => {
    // State for dashboard sub-views
    const [dashboardView, setDashboardView] = useState('main'); // 'main', 'profile', 'settings', 'wallet'
    
    // Helper component for navigation items
    const NavItem = ({ icon: Icon, label, onClick, isActive }) => (
        <button
            onClick={onClick}
            className={`flex items-center space-x-2 p-3 rounded-lg transition-all duration-200 
                        ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
        >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
        </button>
    );
    
    // NEW: Helper component for the Back button
    const GoBackButton = () => (
        <button
            onClick={() => setDashboardView('main')}
            className="flex items-center text-indigo-600 hover:text-indigo-800 font-semibold mb-4 p-2 -ml-2 rounded-lg transition-colors duration-150"
        >
            <ChevronLeft size={20} className="mr-1" />
            Back to Main Exchange
        </button>
    );

    let content;
    
    switch (dashboardView) {
        case 'profile':
            content = (
                <div className="p-6 bg-white rounded-xl shadow-lg space-y-4">
                    <GoBackButton />
                    <h2 className="text-2xl font-bold text-indigo-700 mb-2">Personal Details & Profile</h2>
                    <p className="text-gray-700">Here you can edit your name, bio, skills taught, and skills learned.</p>
                    <div className="mt-4 p-4 border rounded-lg bg-indigo-50">
                        <p className="font-mono text-sm text-indigo-800">User ID: {userId}</p>
                    </div>
                </div>
            );
            break;
        case 'settings':
            content = (
                <div className="p-6 bg-white rounded-xl shadow-lg space-y-4">
                    <GoBackButton />
                    <h2 className="text-2xl font-bold text-indigo-700 mb-2">App Settings</h2>
                    <p className="text-gray-700">Manage notifications, privacy controls, and app preferences.</p>
                </div>
            );
            break;
        case 'wallet':
            content = (
                <>
                    <GoBackButton />
                    <WalletAndExchange userData={userData} db={db} userId={userId} onCoinsChange={onCoinsChange} />
                </>
            );
            break;
        case 'main':
        default:
            // Main view with Skill Posting Form and Live Offers
            content = (
                <>
                    {/* Pass db and userId to SkillPostForm */}
                    <SkillPostForm db={db} userId={userId} /> 
                    {/* Pass db and userId to LiveOffersList */}
                    <LiveOffersList db={db} userId={userId} /> 
                </>
            );
            break;
    }


    return (
        <div className="min-h-screen bg-gray-100 p-6 font-inter w-full max-w-7xl mx-auto">
            
            {/* Main Header / Top Bar */}
            <header className="bg-white p-4 rounded-xl shadow-lg flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                    <h1 className="text-2xl font-extrabold text-indigo-700">
                        SwapSkill Exchange
                    </h1>
                </div>

                <div className="flex items-center space-x-4">
                    {/* SKILL SWAP COINS (Now showing live data) */}
                    <div className="flex items-center bg-yellow-100 text-yellow-800 p-2 rounded-full font-bold text-sm shadow-inner">
                        <DollarSign size={18} className="mr-1 text-yellow-600" />
                        <span>{userData.coins} SC</span>
                    </div>

                    {/* USER ID (Now showing live data) */}
                    <div className="hidden sm:block text-xs text-gray-500 bg-gray-50 p-2 rounded-lg border">
                         Logged in: <span className="font-mono">{userId}</span>
                    </div>
                    
                    <button
                        onClick={onLogout}
                        className="text-sm text-red-600 hover:text-red-800 font-medium py-2 px-3 rounded-lg border border-red-300 transition-colors hover:bg-red-50"
                    >
                        Log Out
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Left Navigation (Profile, Settings, Main, Wallet) */}
                <nav className="lg:col-span-1 bg-white p-4 rounded-xl shadow-lg h-fit">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">Menu</h3>
                    <div className="space-y-1">
                        <NavItem 
                            icon={SendIcon} 
                            label="Main Exchange" 
                            onClick={() => setDashboardView('main')} 
                            isActive={dashboardView === 'main'}
                        />
                        <NavItem 
                            icon={Banknote} 
                            label="Wallet & Exchange" 
                            onClick={() => setDashboardView('wallet')} 
                            isActive={dashboardView === 'wallet'}
                        />
                        <NavItem 
                            icon={User} 
                            label="Personal Details" 
                            onClick={() => setDashboardView('profile')} 
                            isActive={dashboardView === 'profile'}
                        />
                        <NavItem 
                            icon={Settings} 
                            label="Settings" 
                            onClick={() => setDashboardView('settings')} 
                            isActive={dashboardView === 'settings'}
                        />
                    </div>
                </nav>
                
                {/* Main Content Pane */}
                <main className="lg:col-span-3 space-y-6">
                    {content}
                </main>
            </div>
        </div>
    );
};

// --- Authentication Component (Unchanged, simplified to handle Firebase loading) ---
const AuthCard = ({ onLogin, loading }) => {
  // Placeholder for simulated login (real login is handled in App useEffect)
  const handleSimulatedAuth = (method) => {
    onLogin(method); // Trigger the App's login handling (which now initializes Firebase)
  };

  const OAuthButton = ({ method, icon, bgColor, textColor, onClick, disabled, borderColorClass = 'border-gray-200' }) => (
    <button
      onClick={() => onClick(method)}
      disabled={disabled}
      className={`w-full flex items-center justify-center p-3 text-sm font-medium rounded-lg transition-all duration-200
                  ${bgColor} ${textColor} border-2 ${borderColorClass} shadow-sm hover:shadow-md active:scale-[0.98]
                  disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {icon === 'Google' && <span className="text-xl mr-2">G</span>}
      {icon === 'Apple' && <span className="text-xl mr-2"></span>}
      {icon !== 'Google' && icon !== 'Apple' && typeof icon === 'object' && <div className="mr-2">{icon}</div>}
      Continue with {method}
    </button>
  );

  return (
    <div className="w-full max-w-sm bg-white p-8 md:p-10 rounded-xl shadow-2xl border border-gray-200">
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1 tracking-tight">
          Skillswap
        </h1>
        <div className="flex justify-center my-4">
          <div className="bg-indigo-100 p-4 rounded-full text-indigo-600">
            <Lock size={32} strokeWidth={2.5} />
          </div>
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mt-2">
          Account Access
        </h2>
        <p className="text-gray-500 text-sm mt-1">
          Choose your preferred sign-in method:
        </p>
      </div>

      <div className="space-y-4">
        <OAuthButton method="Google" icon="Google" bgColor="bg-white" textColor="text-gray-700" onClick={handleSimulatedAuth} disabled={loading} />
        <OAuthButton method="Apple" icon="Apple" bgColor="bg-gray-800" textColor="text-white" onClick={handleSimulatedAuth} disabled={loading} />
        <OAuthButton method="Telegram" icon={<Send size={20} />} bgColor="bg-[#0088CC]" textColor="text-white" borderColorClass="border-[#0088CC]" onClick={handleSimulatedAuth} disabled={loading} />
      </div>

      <div className="relative flex justify-center items-center my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative bg-white px-3 text-sm text-gray-500 font-medium">
          OR
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleSimulatedAuth('Sign In (Email/Password)')}
          disabled={loading}
          className={`w-full flex items-center justify-center p-3 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50`}
        >
          <LogIn size={20} className="mr-2" />
          Sign In
        </button>
        <button
          onClick={() => handleSimulatedAuth('Sign Up (Email/Password)')}
          disabled={loading}
          className={`w-full flex items-center justify-center p-3 text-indigo-600 bg-indigo-50 border-2 border-indigo-600 hover:bg-indigo-100 rounded-lg font-semibold shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50`}
        >
          <UserPlus size={20} className="mr-2" />
          Sign Up
        </button>
      </div>
    </div>
  );
};

// --- Main App Component (Handles Routing and Firebase Initialization) ---
const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userData, setUserData] = useState({ coins: 0, profileId: null });
  const [loading, setLoading] = useState(true); // Start loading while auth is checked
  const [page, setPage] = useState('dashboard'); 
  
  // 1. Initialize Firebase and authenticate the user
  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authInstance = getAuth(app);
      
      setDb(firestore);
      setAuth(authInstance);

      const handleAuth = async (user) => {
        if (user) {
          const currentUserId = user.uid;
          setUserId(currentUserId);
          setPage('dashboard');
          console.log(`User authenticated with ID: ${currentUserId}`);

          // Attempt to fetch or create initial user profile data (like coins)
          const profileDocRef = doc(firestore, `artifacts/${appId}/users/${currentUserId}/profile/data`);
          const profileSnap = await getDoc(profileDocRef);

          if (profileSnap.exists()) {
            setUserData({ coins: profileSnap.data().coins || 0 });
          } else {
            // Create initial user profile with 100 starter coins
            const starterCoins = 100;
            await setDoc(profileDocRef, { coins: starterCoins, initialSetup: new Date().toISOString() });
            setUserData({ coins: starterCoins });
          }
          
        } else {
            setUserId(null);
            setUserData({ coins: 0 });
            setPage('auth');
            console.log("No user signed in.");
        }
        setLoading(false);
      };

      // Handle custom token sign-in (canvas environment)
      const signIn = async () => {
        if (initialAuthToken) {
          try {
            const userCredential = await signInWithCustomToken(authInstance, initialAuthToken);
            await handleAuth(userCredential.user);
          } catch (error) {
            console.error("Custom Auth Failed, signing in anonymously:", error);
            await signInAnonymously(authInstance);
          }
        } else {
          // If no token, sign in anonymously (for local testing/unauthenticated access)
          await signInAnonymously(authInstance);
        }
      };

      // Listener ensures that if auth state changes (e.g., anonymous sign-in resolves), 
      // the app state updates correctly.
      const unsubscribe = onAuthStateChanged(authInstance, handleAuth);

      // Start the sign-in process
      signIn();

      return () => unsubscribe();

    } catch (error) {
      console.error("Firebase Initialization Error:", error);
      setLoading(false);
    }
  }, []); // Run only once on mount

  // 2. Listener for User Coin Updates (If the wallet is open elsewhere)
  useEffect(() => {
    if (!db || !userId) return;

    const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profile/data`);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            setUserData(prev => ({ ...prev, coins: docSnap.data().coins || 0 }));
        }
    }, (error) => {
        console.error("Error listening to user data:", error);
    });

    return () => unsubscribe();
  }, [db, userId]);

  const handleLogout = async () => {
    if (auth) {
        try {
            await auth.signOut();
            // onAuthStateChanged handler will automatically switch page to 'auth'
            // and reset userId/userData.
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }
  };
  
  // Simple utility for component alerts
  const appAlert = (message) => {
      const modal = document.getElementById('status-modal');
      if (modal) {
          modal.textContent = message;
          modal.classList.remove('hidden');
          setTimeout(() => modal.classList.add('hidden'), 3000);
      }
  };
  
  // Function to manually update coins in the state (used after a successful internal withdrawal simulation)
  const handleCoinsChange = useCallback((newCoins) => {
    setUserData(prev => ({ ...prev, coins: newCoins }));
  }, []);
  
  // Show loading screen while Firebase initializes
  if (loading) {
     return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-inter">
            <div className="fixed inset-0 bg-white flex items-center justify-center z-40">
                <div className="flex items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-indigo-600 mr-4"></div>
                    <p className="text-indigo-600 font-medium text-lg">Initializing Skillswap...</p>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-inter">
      
      {/* Floating Status Modal */}
      <div id="status-modal" className="hidden fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white p-3 rounded-lg shadow-2xl z-50 transition-opacity duration-300">
        Action Initiated!
      </div>

      {page === 'auth' || !userId ? (
        // Pass a simplified onLogin handler for the AuthCard, as the real auth is done via onAuthStateChanged
        <AuthCard onLogin={appAlert} loading={loading} />
      ) : (
        // Pass Firebase instances and user data to the Dashboard
        <Dashboard 
            onLogout={handleLogout} 
            db={db} 
            auth={auth} 
            userId={userId} 
            userData={userData}
            onCoinsChange={handleCoinsChange}
        />
      )}
    </div>
  );
};

export default App;
