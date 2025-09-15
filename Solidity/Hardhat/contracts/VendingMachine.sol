// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import "./IsodaPrice.sol";

contract VendingMachine{

    IsodaPrice public sodaAddress;
    address owner;
    uint public soda_count;
    constructor(address _add) {
        owner=msg.sender;
        soda_count=100;
        sodaAddress=IsodaPrice(_add);
    }

    function buy() public payable {
        require(msg.value==sodaAddress.getPrice(),"Not Enough Money");
        require(soda_count>0,"Soda is out of stock");
        soda_count--;
    }
    function Totalsoda() public view returns(uint){
        return soda_count;
    }
}