var RUCMarket = artifacts.require("./RUCMarket.sol");
var RUCToken = artifacts.require("./RUCToken.sol");

module.exports = function(deployer) {
  deployer.deploy(RUCToken,1000000).then(function(){
  	// tokenPrice = 0.001 ether
  	var tokenPrice = 1000000000000000;
  	return deployer.deploy(RUCMarket, RUCToken.address, tokenPrice);
  });
};