import { ethers } from 'ethers';
import { Connection, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1'
import { ECPairFactory } from 'ecpair';
const ECPair = ECPairFactory(ecc);

// --- RPC URLs ---
// V IMPORTANT: REPLACE WITH YOUR ACTUAL GETBLOCK API KEY
const ETH_RPC_URL = 'https://go.getblock.us/81990708e37a492c89af1f1b7a82cb9a';
export const SOL_RPC_URL = 'https://go.getblock.us/bbcb5a2482ba4a86a3d1e633fcdb36fe';

// --- Balance Fetching ---
export async function getEthBalance(address) {
  const provider = new ethers.JsonRpcProvider(ETH_RPC_URL);
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}
export async function getSolBalance(address) {
  const connection = new Connection(SOL_RPC_URL);
  const publicKey = new PublicKey(address);
  const balance = await connection.getBalance(publicKey);
  return balance / LAMPORTS_PER_SOL;
}
export async function getBtcBalance(address) {
  try {
    const response = await fetch(`https://blockchain.info/q/addressbalance/${address}`);
    if (!response.ok) throw new Error(`BTC balance fetch failed for address: ${address}`);
    const data = await response.text();
    return parseInt(data) / 100000000; // Satoshis to BTC
  } catch (error) {
    console.error("Failed to fetch BTC balance:", error);
    return 0;
  }
}

// --- Transaction Sending ---
export async function sendEth(privateKey, to, amountStr) {
  const provider = new ethers.JsonRpcProvider(ETH_RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const tx = await wallet.sendTransaction({ to, value: ethers.parseEther(amountStr) });
  await tx.wait();
  return tx.hash;
}
// src/services/blockchain.js

// ... (keep all the other functions as they are) ...

export async function sendSol(privateKey, to, amount) {
  const connection = new Connection(SOL_RPC_URL, 'confirmed');
  const fromKeypair = Keypair.fromSecretKey(bs58.decode(privateKey));
  const toPublicKey = new PublicKey(to);
  const { blockhash } = await connection.getLatestBlockhash();

  const transaction = new Transaction({
    feePayer: fromKeypair.publicKey,
    recentBlockhash: blockhash,
  }).add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: toPublicKey,
      lamports: amount * LAMPORTS_PER_SOL,
    })
  );

  transaction.sign(fromKeypair);
  const signature = await connection.sendRawTransaction(transaction.serialize());
  return signature;
}

// ... (keep the sendBtc function as it is) ...
export async function sendBtc(privateKeyWIF, toAddress, amountBTC) {
    const network = bitcoin.networks.bitcoin;
    const keyPair = ECPair.fromWIF(privateKeyWIF, network);
    const { address: fromAddress } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network });

    const utxoResponse = await fetch(`https://blockchain.info/unspent?active=${fromAddress}`);
    const utxoData = await utxoResponse.json();
    const utxos = utxoData.unspent_outputs;
    if (utxos.length === 0) throw new Error("No spendable outputs (UTXOs) found.");
    
    const psbt = new bitcoin.Psbt({ network });
    const amountSatoshis = Math.floor(amountBTC * 1e8);
    const fee = 15000; // Simplified fee
    let totalInput = 0;

    for (const utxo of utxos) {
      if (totalInput >= amountSatoshis + fee) break;
      totalInput += utxo.value;
      const txHex = await (await fetch(`https://blockchain.info/rawtx/${utxo.tx_hash_big_endian}?format=hex`)).text();
      psbt.addInput({ hash: utxo.tx_hash_big_endian, index: utxo.tx_output_n, nonWitnessUtxo: Buffer.from(txHex, 'hex') });
    }

    if (totalInput < amountSatoshis + fee) throw new Error("Insufficient funds for transaction.");

    psbt.addOutput({ address: toAddress, value: amountSatoshis });
    const change = totalInput - amountSatoshis - fee;
    if (change > 546) psbt.addOutput({ address: fromAddress, value: change }); // Don't create dust outputs

    psbt.signAllInputs(keyPair);
    psbt.finalizeAllInputs();

    const txHex = psbt.extractTransaction().toHex();
    const broadcastResponse = await fetch('https://blockchain.info/pushtx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `tx=${txHex}`
    });

    if (!broadcastResponse.ok) {
      const text = await broadcastResponse.text();
      throw new Error(`Failed to broadcast BTC transaction: ${text}`);
    }
    return psbt.extractTransaction().getId();
}