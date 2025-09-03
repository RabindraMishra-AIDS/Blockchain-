// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

//Working with functions in solidity

contract myNumber {
    uint public ph=99999999999;
    string public rating="A";

    function setmyNumber (uint newNumber) public{ //EOA can access it outside this contract/class
        ph=newNumber;
    }
    //calldata:Read only,memory:Heap,storage:Permanent(Hard disk)

    function updateRating(string calldata _rating)public{
        rating=_rating;
    }
}