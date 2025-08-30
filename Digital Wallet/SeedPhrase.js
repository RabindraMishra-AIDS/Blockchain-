const bip39=require('bip39');
const ethers=require('ethers');
const bitcoin=require('bitcoinjs-lib');
const {BIP32Factory}=require('bip32');
const ecc=require('tiny-secp256k1');
const {Keypair}=require('@solana/web3.js');
const {derivePath}=require('ed25519-hd-key');
const bs58 = require('bs58');

const bip32=BIP32Factory(ecc); //bip32 is protocol using ecc algorithm. consider ecc as engine of bip32.

function deriveEthereumWallet(seed){
    const ethPath="m/44'/60'/0'/0/0";
    const rootNode=ethers.HDNodeWallet.fromSeed(seed); //calculate Rootnode for etherium.
    const ethNode=rootNode.derivePath(ethPath);//bip32 is universal it is not necessarily only for bitcoin.

    console.log("\n---------Ethereum----------");
    console.log("Derivation Path: ",ethPath);
    console.log("Private Key: ",ethNode.privateKey);
    console.log("Public Key: ",ethNode.publicKey);
    console.log("Address: ",ethNode.address);
}



function deriveBitcoinWallet(seed){
    const btcpath="m/44'/0'/0'/0/0"; //Path of bitcoin
    const rootNode=bip32.fromSeed(seed);
    const btcNode=rootNode.derivePath(btcpath);//rootnode(Masterkey) se bitcoin path is getting derived.
    const btcAddress=bitcoin.payments.p2pkh({ //p2pkh is the algorithm name that is being used.
        pubkey:Buffer.from(btcNode.publicKey), //public key se hi public address milta hai.
    }).address;
    const publicKey=Array.from(btcNode.publicKey).map(byte=>byte.toString(16).padStart(2,'0')).join('');


    console.log("\n------Bitcoin----");
    console.log("Derivation Path: ",btcpath);
    console.log("Private Key(WIF): ",btcNode.toWIF()); //btcNode contains private and public key
    console.log("Public Key: ",publicKey);
    console.log("Address: ",btcAddress);
}

function deriveSolanaWallet(seed){
    const solanaPath="m/44'/501'/0'/0'";
    const solanaDerivedSeed=derivePath(solanaPath,seed).key; //Derived seed of solana.
    const solanaKeypair=Keypair.fromSeed(solanaDerivedSeed);
    const solanaAddress=solanaKeypair.publicKey.toBase58();


    const solanaPrivateKey=bs58.default.encode(solanaKeypair.secretKey);

    console.log("\n------------Solana----------------");
    console.log("Derived Path: ",solanaPath);
    console.log("Private Key(Base58):",solanaPrivateKey);
    console.log("Public Key/Address: ",solanaAddress);
}

async function Main(){
    const mnemonic=bip39.generateMnemonic(); //Generate 12 word seed Phrase.(2step --> 128bit number+checksum=132bit number)
    console.log("12 word phrase generated sucessfully");//Note:this is not Master Key.
    console.log(mnemonic); //But machine require numbers to undestand thus need one extra step.


    const seed=await bip39.mnemonicToSeed(mnemonic);

    deriveSolanaWallet(seed);
    deriveEthereumWallet(seed);
    deriveBitcoinWallet(seed);

    console.log("\n=============================================");
    console.log("Wallet Generation is completed");
}
Main().catch(console.error);

//Ethereum is generally written in solidity but ethers library help us to deal with ethereum in Javascript.
//bip32 is old version to create a rootnode
//Ethers also uses bip32 inaddition it also optimizes many more things.
//RootNode will contain many more functionalities.It wont simply contains public and private key.
//ethers=bip32+extra powers.