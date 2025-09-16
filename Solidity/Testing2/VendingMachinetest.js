const {expect} = require("chai");
const VendingMod = require("../Deploy.js"); // Assuming this exports the deployment module
const {ethers, ignition} = require("hardhat");

// Using loadFixture for fixing the deployment load
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Testing our Machine", function(){

    async function vendingMachineDeploy(){
        // Fetching signers (accounts) - similar to addresses in Remix IDE
        const [owner, buyer] = await ethers.getSigners();
        // Here we are destructuring our Array.

        // ======= Deploying the Module for Testing ========
        // Assuming VendingMod is the deployment module
        const {vendingMachine, sodaPrice} = await ignition.deploy(VendingMod);

        return {owner, buyer, vendingMachine, sodaPrice};
    }

    // ==================== Checking the Ownership ==========================
    it("Owner Analysed Successfully", async function(){
        // vending machine & owner address must match
        const {owner, vendingMachine} = await loadFixture(vendingMachineDeploy);
        const ownerVending = await vendingMachine.owner();
        expect(ownerVending).to.equal(owner.address);
    });

    // ============== Understand the concept of State Resetting for Smart Contract Testing ==============
    // To test require statement in contract we can use (revertedWith)

    it("should Revert if payment is failed", async function(){
        const {owner, buyer, vendingMachine, sodaPrice} = await loadFixture(vendingMachineDeploy);
        
        const price = await sodaPrice.getPrice(); // fetching soda price dynamically from other smart contracts

        // Test with incorrect payment (e.g., less than required price)
        const incorrectPayment = price - 1n; // 1 wei less than required
        
        await expect(
            vendingMachine.connect(buyer).buy({value: incorrectPayment})
        ).to.be.revertedWith("Not Enough Money");
        // RevertedWith ensures transaction fails with revert. 
        // Here buy is function defined in VendingMachine Contract.
    });

});