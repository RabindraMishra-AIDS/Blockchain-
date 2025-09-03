// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Func {
    uint public Age=4;

    function getAge()public view returns(uint){//We have used view because our function is just reading state/class variable
        return Age;
    }

    function Paisadouble(uint _paisa) public pure returns(uint){
        return _paisa*2; //here as we are not affecting any state variable.Thus this is a pure function.
    }

    //Finding Sum of N numbers in Solidity.
    function SUM_N(uint _n) public  pure returns(uint){
        uint total=0;
        for(uint i=1;i<=_n;i++){ //for loop in solidity
            total+=i;
        }
        return total;
    }

}