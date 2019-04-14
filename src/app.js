
//// node

//var Web3 = require('web3')
//console.log(Web3)

//var EthCrypto = require('eth-crypto')
//console.log(EthCrypto)
//exports.id = 'eth-crypto'
//console.log(require('./eth-crypto'));
//
//console.log(EthCrypto);
//const identity = EthCrypto.createIdentity();
//var JSEnc
var courier = new JSEncrypt();
//console.log(encrypt);
var public_key = courier.getPublicKey();
var private_key = courier.getPrivateKey();
//console.log(public_key);
//console.log(private_key);

var message = 'beijing,100872';

//var encrypted = courier.encrypt(message);
//console.log(encrypted);

//var decrypted = courier.decrypt(encrypted);
//console.log(decrypted);

var tempCourier = new JSEncrypt();
tempCourier.setPublicKey(public_key);
var encrypted = tempCourier.encrypt(message);
console.log(tempCourier);
console.log(encrypted);
var decrypted = courier.decrypt(encrypted)
console.log(decrypted);