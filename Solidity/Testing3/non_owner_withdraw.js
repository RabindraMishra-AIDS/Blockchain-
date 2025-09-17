//==================== Write a Test case for not allowing non owners to withdraw any amount =====================

const {expect} = require("chai");
const VendingMod = require("../Deploy.js"); // Assuming this exports the deployment module
const {ethers} = require("hardhat");
const {buildModule} = require("@nomicfoundation/hardhat-ignition/modules");

// Using loadFixture for fixing the deployment load
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// Mock deployment function (should be defined elsewhere in your test suite)
async function vendingMachineDeploy(){
    const [owner, buyer] = await ethers.getSigners();
    
    // Option 1: Using Ignition properly
    const {vendingMachine, sodaPrice} = await hre.ignition.deploy(VendingMod);
    
    // Option 2: Direct contract deployment (more common in tests)
    // const SodaPrice = await ethers.getContractFactory("SodaPrice");
    // const sodaPrice = await SodaPrice.deploy();
    // const VendingMachine = await ethers.getContractFactory("VendingMachine");
    // const vendingMachine = await VendingMachine.deploy(sodaPrice.address);
    
    return {owner, buyer, vendingMachine, sodaPrice};
}

it("Allowing only owner to withdraw the money", async function(){
    const {owner, buyer, vendingMachine, sodaPrice} = await loadFixture(vendingMachineDeploy);

    // Get the current price for buying soda
    const price = await sodaPrice.getPrice();

    // First we need to buy some soda to have funds in the contract
    await vendingMachine.connect(buyer).buy({value: price});

    // Now write the test case - non-owner should not be able to withdraw
    await expect(vendingMachine.connect(buyer).withdraw()).to.be.revertedWith("You are not a owner");
});