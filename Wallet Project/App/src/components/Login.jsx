import React, { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { generateMnemonic } from '../services/wallet';

function Login() {
    const [mnemonic, setMnemonic] = useState('');
    const [newMnemonic, setNewMnemonic] = useState('');
    const [error, setError] = useState('');
    const { login } = useWallet();

    const handleImport = async (e) => {
        e.preventDefault();
        if (!mnemonic.trim() || mnemonic.trim().split(' ').length !== 12) {
            setError('Please enter a valid 12-word mnemonic phrase.');
            return;
        }
        try {
            setError('');
            await login(mnemonic.trim());
        } catch (err) {
            setError('Invalid mnemonic phrase. Please check and try again.');
        }
    };

    const handleCreate = () => setNewMnemonic(generateMnemonic());
    const proceedWithNewMnemonic = async () => await login(newMnemonic);

    if (newMnemonic) {
        
        return (
            <div className="max-w-md mx-auto mt-10 bg-base-200 p-8 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-center mb-4">Save Your Secret Phrase</h2>
                <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 rounded-md mb-6">
                    <p className="font-bold">IMPORTANT!</p>
                    <p>Write this 12-word phrase down. It's the only way to recover your wallet.</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg text-center font-mono text-lg tracking-wider my-4">
                    {newMnemonic}
                </div>
                <button onClick={proceedWithNewMnemonic} className="w-full btn btn-primary mt-2">
                    I've Saved It, Continue
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto mt-10">
            <h1 className="text-4xl font-bold text-center mb-4">Simple Crypto Wallet</h1>
            <div className="bg-base-200 p-8 rounded-xl shadow-lg mb-6">
                <h2 className="text-2xl font-semibold mb-4">Import Existing Wallet</h2>
                <form onSubmit={handleImport}>
                    <textarea
                        value={mnemonic}
                        onChange={(e) => setMnemonic(e.target.value)}
                        placeholder="Enter your 12-word mnemonic phrase..."
                        className="w-full p-3 border border-gray-600 rounded-lg bg-base-100 focus:ring-2 focus:ring-blue-500 transition"
                        rows="3"
                    />
                    <button type="submit" className="mt-4 w-full btn btn-primary">
                        Import Wallet
                    </button>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </form>
            </div>

            <div className="bg-base-200 p-8 rounded-xl shadow-lg">
                <h2 className="text-2xl font-semibold mb-2">Create a New Wallet</h2>
                <p className="text-gray-400 mb-4">No wallet yet? Create one now.</p>
                <button onClick={handleCreate} className="w-full btn btn-neutral">
                    Create New Wallet
                </button>
            </div>
        </div>
    );
}

export default Login;