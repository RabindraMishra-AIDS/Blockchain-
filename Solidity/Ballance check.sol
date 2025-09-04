// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FuncBallance{

    function getBalance() public view returns(uint){
        return address(this).balance;
    }
}