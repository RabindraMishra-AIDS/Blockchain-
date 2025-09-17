// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

contract Election {
    address public ElectionOwner;
    constructor(){
        ElectionOwner=msg.sender;  
    }
    struct party{
        string name;
        uint totalvote;
    }
    struct voter{
        bool isRegistered;
        bool hasVoted;
        uint age;
    }
    modifier owner(){
        require(ElectionOwner==msg.sender,"Only Election Commission has acess");
        _;
    }
    mapping(address=>voter) public voters;
    party[] public parties;

    //Registring Political Party.
    function PartyRegister(string memory _name) public owner{

       //Need to check whether party is already registered or not.
       for(uint i=0;i<parties.length;i++){
        //cannot compare strings Directly
        require(keccak256(abi.encodePacked(parties[i].name))!=keccak256(abi.encodePacked(_name)),"Party is already Registered");
       } 
       party memory newParty =party({
            name:_name,
            totalvote:0
        });
        parties.push(newParty);
    }

    //Function Voting 
    function CastVote(uint _index) public{
        require(voters[msg.sender].isRegistered==true,"Voter is not Registered");
        require(voters[msg.sender].hasVoted==false,"Voter has already Voted");
        parties[_index].totalvote+=1;
        voters[msg.sender].hasVoted=true;
    }

    //Registring a Voter
    function VoterRegistration(uint _age,address _voter) public owner{
        require(_age >=18,"Voter must be above 18");
        require(voters[_voter].isRegistered==false,"Voter is already Registered");
        voters[_voter].isRegistered=true;
    }
    //Displaying Voting Result
    struct Result{
        string name;
        uint votes;
    }

    function getResult() public view returns(Result[] memory){
        Result[] memory results=new Result[](parties.length); //new is used to allocate the memory
        for(uint i=0;i<parties.length;i++){
            results[i]=Result({
                name:parties[i].name,
                votes:parties[i].totalvote
            });
        }
        return results;
    }
}