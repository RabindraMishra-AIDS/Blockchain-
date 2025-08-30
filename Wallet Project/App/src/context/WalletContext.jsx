import React, { createContext, useState, useContext, useEffect } from 'react';
import { createWalletFromMnemonic } from '../services/wallet';

// 1. Create the context
const WalletContext = createContext(null);

// 2. Create the Provider component
export const WalletProvider = ({ children }) => {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  // This effect runs once when the app starts
  useEffect(() => {
    // Try to load a saved wallet from the browser's local storage
    try {
      const savedWallet = localStorage.getItem('cryptoWallet');
      if (savedWallet) {
        setWallet(JSON.parse(savedWallet));
      }
    } catch (error) {
      console.error("Failed to parse wallet from localStorage", error);
      // If there's an error, clear the corrupted data
      localStorage.removeItem('cryptoWallet');
    }
    // Finished trying to load, so set loading to false
    setLoading(false);
  }, []);

  // 12 word wallet create kar do
  // Function to create/import a wallet and save it to state
  const login = async (mnemonic) => {
    setLoading(true);
    const newWallet = await createWalletFromMnemonic(mnemonic);
    setWallet(newWallet);
    // Save the new wallet to localStorage for persistence
    localStorage.setItem('cryptoWallet', JSON.stringify(newWallet));
    setLoading(false);
  };

  // Function to log out and clear all data
  const logout = () => {
    setWallet(null);
    // Remove the wallet from localStorage
    localStorage.removeItem('cryptoWallet');
  };

  // The value that will be provided to all consuming components
  const value = { wallet, loading, login, logout };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// 3. Create a custom hook for easy access to the context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === null) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};