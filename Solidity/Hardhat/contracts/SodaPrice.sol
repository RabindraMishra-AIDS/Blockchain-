// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./IsodaPrice.sol";

contract SodaPrice  is IsodaPrice{ //this statement tells that getprice defined in Isoda is part of sodaprice.
    uint public price;
    address public owner;
    constructor() {
        owner=msg.sender;
        price=1 ether;
    }

    function getPrice() external view returns (uint){
        return price;
    }

    function setPrice(uint _price) public {
        require(msg.sender==owner,"Acess is only Provided to owners");
        price=_price;
    }
}