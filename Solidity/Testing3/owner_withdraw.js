//============ Write a test case for successful withdrawal ===========

const {expect} = require("chai");
const {ethers} = require("hardhat");
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Owner Withdrawal Test", function(){
    
    async function vendingMachineDeploy(){
        const [owner, buyer] = await ethers.getSigners();
        
        // Deploy SodaPrice contract
        const SodaPrice = await ethers.getContractFactory("SodaPrice");
        const sodaPrice = await SodaPrice.deploy();
        
        // Deploy VendingMachine contract
        const VendingMachine = await ethers.getContractFactory("VendingMachine");
        const vendingMachine = await VendingMachine.deploy(sodaPrice.address);
        
        return {owner, buyer, vendingMachine, sodaPrice};
    }

    it("Owner should be able to withdraw successfully", async function(){
        const {owner, buyer, vendingMachine, sodaPrice} = await loadFixture(vendingMachineDeploy);
        
        // Get the soda price
        const price = await sodaPrice.getPrice();
        
        // Buyer purchases soda to add funds to the contract
        await vendingMachine.connect(buyer).buy({value: price});
        
        // Check initial contract balance (should have the price amount)
        const initialBalance = await ethers.provider.getBalance(vendingMachine.address);
        expect(initialBalance).to.equal(price);
        
        // Get owner's initial balance
        const ownerInitialBalance = await ethers.provider.getBalance(owner.address);
        
        // Owner withdraws funds
        const withdrawTx = await vendingMachine.connect(owner).withdraw();
        const receipt = await withdrawTx.wait();
        
        // Calculate gas cost
        const gasUsed = receipt.gasUsed;
        const gasPrice = withdrawTx.gasPrice;
        const gasCost = gasUsed * gasPrice;
        
        // Check contract balance after withdrawal (should be 0)
        const finalContractBalance = await ethers.provider.getBalance(vendingMachine.address);
        expect(finalContractBalance).to.equal(0);
        
        // Check owner's balance increased (minus gas fees)
        const ownerFinalBalance = await ethers.provider.getBalance(owner.address);
        const expectedBalance = ownerInitialBalance + price - gasCost;
        expect(ownerFinalBalance).to.equal(expectedBalance);
    });

    it("Owner should be able to withdraw multiple times", async function(){
        const {owner, buyer, vendingMachine, sodaPrice} = await loadFixture(vendingMachineDeploy);
        
        const price = await sodaPrice.getPrice();
        
        // Multiple purchases to accumulate funds
        await vendingMachine.connect(buyer).buy({value: price});
        await vendingMachine.connect(buyer).buy({value: price});
        await vendingMachine.connect(buyer).buy({value: price});
        
        // Check contract has accumulated funds
        const contractBalance = await ethers.provider.getBalance(vendingMachine.address);
        expect(contractBalance).to.equal(price * 3n);
        
        // Owner withdraws all funds
        await vendingMachine.connect(owner).withdraw();
        
        // Verify contract balance is now zero
        const finalBalance = await ethers.provider.getBalance(vendingMachine.address);
        expect(finalBalance).to.equal(0);
        
        // Buy more soda and withdraw again
        await vendingMachine.connect(buyer).buy({value: price});
        await vendingMachine.connect(owner).withdraw();
        
        // Verify second withdrawal was successful
        const finalBalanceAfterSecond = await ethers.provider.getBalance(vendingMachine.address);
        expect(finalBalanceAfterSecond).to.equal(0);
    });
});
