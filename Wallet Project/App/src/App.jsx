import { useWallet } from './context/WalletContext.jsx';
import Login from './components/Login.jsx';
import WalletDashboard from './components/WalletDashboard.jsx';

function App() {
  const { wallet, loading } = useWallet();

  const LoadingSpinner = () => (
    <div className="flex justify-center items-center min-h-screen">
      <div className="text-xl font-semibold">Loading Wallet...</div>
    </div>
  );

  return (
    
    <div className="min-h-screen"> 
      <div className="container mx-auto p-4 md:p-8">
        {loading ? <LoadingSpinner /> : wallet ? <WalletDashboard /> : <Login />}
      </div>
    </div>
  );
}

export default App;