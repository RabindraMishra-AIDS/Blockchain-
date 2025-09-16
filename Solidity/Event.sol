// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

//Understanding Event concept in Solifity
contract Event_Concept {
    //creating a event
    event SodaAddress(address _from,uint _value);
    uint soda=100;

    function buySoda() public payable {
        require(soda>0,"Soda is out of stock");
        require(msg.value==1 ether, "Require 1 ether");
        soda=soda-1;
        emit SodaAddress(msg.sender,msg.value); //emiting the event
    }

    //can also use indexing in event.
    event List(address indexed buyer,uint _value);
}
//event creates a wall so that frontend/website can see/read the state of the variable through it.
//event can be used to retreive user history in ethereum