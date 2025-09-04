// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

contract Modifier {
    //Creating our own modifier.
    address public owner;
    modifier myown(){
        require(msg.sender==owner,"Sorry Acess deneid!");//error message
        _;
    }

    //Now we can attach the modifier to function like a tag/attribute
    //function basic() public myown{...code... }
}