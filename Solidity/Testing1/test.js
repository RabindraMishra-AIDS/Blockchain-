const {expect} = require("chai");
const {describe, it} = require("mocha");

//{describe,it} = mocha, {expect} = chai
//`it` is used to create test cases, describe is used to create test suites, expect is used to assert/match the results.

describe("Testing Mathematical Functions", function(){
  it("Adding two numbers", function(){
    let a = 10;
    let b = 20;
    const expected_result = 30;
    const actual_result = a + b;
    expect(actual_result).to.equal(expected_result);
  });
  
  it("Subtracting two numbers", function(){
    let a = 20;
    let b = 10;
    const expected_result = 10;
    const actual_result = a - b;
    expect(actual_result).to.equal(expected_result);
  });
});

//=============== use (npx hardhat test) to test the script ======================
