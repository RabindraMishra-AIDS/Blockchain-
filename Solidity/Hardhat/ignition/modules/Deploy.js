// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const initialPrice = "10000000000000000"; // 0.01 ETH in wei

export default buildModule("VendingMachineModule", (m) => {
  // Deploy the SodaPrice contract first
  const sodaPrice = m.contract("SodaPrice", []);
  
  // Set the initial price on the SodaPrice contract
  m.call(sodaPrice, "setPrice", [initialPrice]);
  
  // Deploy the VendingMachine contract with SodaPrice address
  const vendingMachine = m.contract("VendingMachine", [sodaPrice]);

  return { sodaPrice, vendingMachine };
});