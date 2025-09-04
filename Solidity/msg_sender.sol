// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Ownsership{
    //msg.sender contains address of person calling contract function.
    //can be used to restrict acess,especially for owners.
    //example:-ony owner can call withdraw function from contract

    address public owner;
    constructor() {
        owner=msg.sender; //runs only once during deployment
    }

    function checkBalance() public view returns(uint){
        require(msg.sender==owner,"Only owner has the acess of it!");
        return owner.balance;
    }
}

//Can also use custom modifier to apply rules to multiple functions.