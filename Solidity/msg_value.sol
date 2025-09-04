// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Value{
    //status must be changed only if sender gives 1 ether.

    string public status="Learning ethereum";

    function newStatus(string calldata _status) public payable {
        require(msg.value==1 ether,"1ether is required to acess this function!");
        status=_status;
    }
}