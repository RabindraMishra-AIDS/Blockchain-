// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract witdrawfromContact{
    address owner;
    constructor(){
        owner=msg.sender;
    }

    function withdraw() public payable {
        require(msg.sender==owner,"Only owner can call this function!");
        payable (owner).transfer(address(this).balance);
    }
}