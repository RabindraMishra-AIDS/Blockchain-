//================= Write a test case for denying purchase of soda if inventory is empty =============

const {expect} = require("chai");
const {ethers} = require("hardhat");
const {loadFixture} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const vendingMod = require("../Deploy.js");

describe("Test our Inventory", function(){
    
    async function vendingMachineDeploy(){
        const [owner, buyer] = await ethers.getSigners();
        // Using direct contract deployment instead of ignition.deploy()
        const SodaPrice = await ethers.getContractFactory("SodaPrice");
        const sodaPrice = await SodaPrice.deploy();
        
        const VendingMachine = await ethers.getContractFactory("VendingMachine");
        const vendingMachine = await VendingMachine.deploy(sodaPrice.address);
        
        return {owner, buyer, vendingMachine, sodaPrice};
    }

    it("Tested Inventory successfully", async function(){
        const {owner, buyer, vendingMachine, sodaPrice} = await loadFixture(vendingMachineDeploy);
        
        // Getting price dynamically
        const price = await sodaPrice.getPrice();

        // First Need to buy all sodas to make inventory zero
        // Suppose we have 100 sodas
        for(let i = 0; i < 100; i++){
            await vendingMachine.connect(buyer).buy({value: price});
        }

        // Now soda inventory has become zero
        expect(await vendingMachine.Totalsoda()).to.equal(0);

        // Deny buying of soda when inventory is empty
        await expect(vendingMachine.connect(buyer).buy({value: price})).to.be.revertedWith("Soda is out of stock");
    });
});