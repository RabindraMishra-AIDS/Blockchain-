import { Connection, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import bs58 from 'bs58';

async function sendSolanaTransactionRaw(privateKey,to,amount) {
    //Create connection with RPC Provider

    const connection = new Connection("rpc_server_link"); // Replace with your RPC provider
    const fromKeyPair=Keypair.fromSecretKey(bs58.decode(privateKey));

    const toPublicKey = new PublicKey(to);
     try {

    const latestBlockhash = await connection.getLatestBlockhash();

        //Create Transaction
    const transaction = new Transaction();
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = fromKeyPair.publicKey;

        //Add transaction Instrcution
        transaction.add(
            SystemProgram.transfer({
                fromPubkey: fromKeyPair.publicKey,
                toPubkey: toPublicKey,
                lamports: amount * LAMPORTS_PER_SOL
            })
        );

        //sign the transaction
    transaction.sign(fromKeyPair);

        //Send raw transaction
        const signature = await connection.sendRawTransaction(
            transaction.serialize(),
            {
                skipPreflight: false,
                preflightCommitment: 'confirmed'
            }
        );
        console.log('Transaction sent: ', signature);
        
    } catch (error) {
        console.error("Transaction Failed:", error.message);
    }
}