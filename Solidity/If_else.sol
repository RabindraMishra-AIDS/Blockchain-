// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Loop {
    //============== if else ====================

    function Category(uint _money) public pure returns(string memory){
        if (_money<1000){
            return "Poor";
        }
        else if (_money >1000 && _money<10000){
            return "Middle Class";
        }
        else{
            return "rich";
        }
    }
    
}