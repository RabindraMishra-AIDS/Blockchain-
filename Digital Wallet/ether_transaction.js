import {ethers} from 'ethers';

async function sendTransactionWithProvider(privateKey,to, amount){
    //Create provider using GetBlock
    const provider=new ethers.JsonRpcProvider(`rpc server link`);

    const wallet=new ethers.Wallet('Enter your Private key'); //Creating a wallet private key must be kept confidential.

    try {

        const tx= await wallet.sendTransaction({ //digital signature and all will get handled here
            to:to,
            value:ethers.parseEther(amount)
        });

        console.log("Transaction sent sucessfully",tx.hash);

        //Confirmation of transaction completetion
        const receipt=await tx.wait();
        console.log("Transaction confirmed at block:",receipt.blockNumber);
        return tx.hash;    
    } catch (error) {
        console.error("Transaction Failed: ",error.message);
        throw error;
    }
}
//Now you can make a function call using your private key,public address of receiver
sendTransactionWithProvider(); //pass required agument parameters