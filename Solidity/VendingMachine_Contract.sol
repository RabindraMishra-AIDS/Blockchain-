// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract VendingMachine{
    uint soda_count;
    address owner;
    constructor(){
        soda_count=100;
        owner=msg.sender;
    }

    function checkSodaCount() public view returns(uint){
        return soda_count;
    }

    modifier Acessowner(){
        require(msg.sender==owner,"Only owner has the acess!");
        _;
    }

    function withdrawMoney() public payable Acessowner{
        payable (owner).transfer(address(this).balance);
    }

    function addsoda(uint _soda) public Acessowner{
        soda_count+=_soda;
    }
    function buySoda() public payable {
        require(soda_count>0,"Soda out of stock!");
        require(msg.value==1 ether,"Cost is 1 ether");
        soda_count-=1;
    }


}