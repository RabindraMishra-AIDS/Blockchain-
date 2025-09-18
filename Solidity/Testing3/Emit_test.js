const {expect} = require("chai");
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const {ethers} = require("hardhat");

describe("Testing Emit", function(){

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

    it("Emit must work Properly", async function(){

        const {buyer, vendingMachine, sodaPrice} = await loadFixture(vendingMachineDeploy);

        const price = await sodaPrice.getPrice();

        // Test event emission - adjust event name and parameters based on your actual contract
        await expect(vendingMachine.connect(buyer).buy({value: price}))
            .to.emit(vendingMachine, "SodaPurchased")
            .withArgs(buyer.address, price);
    });
});