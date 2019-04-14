

//var Web3 = require('web3')
//console.log(Web3)

//
//console.log(EthCrypto);
//const identity = EthCrypto.createIdentity();
//var JSEnc
//var courier = new JSEncrypt();
//console.log(encrypt);
//var private_key = courier.getPrivateKey();
//console.log(public_key);
//console.log(private_key);

//var message = 'beijing,100872';

//var encrypted = courier.encrypt(message);
//console.log(encrypted);

//var decrypted = courier.decrypt(encrypted);
//console.log(decrypted);

//var tempCourier = new JSEncrypt();
//tempCourier.setPublicKey(public_key);
//var encrypted = tempCourier.encrypt(message);
//console.log(tempCourier);
//console.log(encrypted);
//var decrypted = courier.decrypt(encrypted)
//console.log(decrypted);
App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  loading: false,
  tokenPrice: 1000000000000000,
  tokensSold: 0,
  tokensAvailable: 750000,

  init: function() {
    console.log("App initialized...")
    return App.initWeb3();
  },

  initWeb3: function() {
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContracts();
  },

  initContracts: function() {
    $.getJSON("RUCMarket.json", function(rucMarket) {
      App.contracts.RUCMarket = TruffleContract(rucMarket);
      App.contracts.RUCMarket.setProvider(App.web3Provider);
      App.contracts.RUCMarket.deployed().then(function(rucMarket) {
        console.log("RUC Market Address:", rucMarket.address);
      });
    }).done(function() {
      $.getJSON("RUCToken.json", function(rucToken) {
        App.contracts.RUCToken = TruffleContract(rucToken);
        App.contracts.RUCToken.setProvider(App.web3Provider);
        App.contracts.RUCToken.deployed().then(function(rucToken) {
          console.log("RUC Token Address:", rucToken.address);
        });

        App.listenForEvents();
        return App.render();
      });
    })
  },

  // Listen for events emitted from the contract
  listenForEvents: function() {
    App.contracts.RUCMarket.deployed().then(function(instance) {
      instance.TokenSell({}, {
        fromBlock: 0,
        toBlock: 'latest',
      }).watch(function(error, event) {
        console.log("event triggered", event);
        App.render();
      })
    })
  },

  render: function() {
    if (App.loading) {
      return;
    }
    App.loading = true;
    var loader  = $('#loader');
    var content = $('#content');

    loader.show();
    content.hide();

    // Load account data
    web3.eth.getCoinbase(function(err, account) {
      if(err === null) {
        App.account = account;
        $('#accountAddress').html("Your Account: " + account);
      }
    })

    // Load token sale contract
    App.contracts.RUCMarket.deployed().then(function(instance) {
      rucMarketInstance = instance;
      return rucMarketInstance.tokenPrice();
    }).then(function(tokenPrice) {
      App.tokenPrice = tokenPrice;
      $('.token-price').html(web3.fromWei(App.tokenPrice, "ether").toNumber());
      return rucMarketInstance.tokensSold();
    }).then(function(tokensSold) {
      App.tokensSold = tokensSold.toNumber();
      $('.tokens-sold').html(App.tokensSold);
      $('.tokens-available').html(App.tokensAvailable);

      var progressPercent = (Math.ceil(App.tokensSold) / App.tokensAvailable) * 100;
      $('#progress').css('width', progressPercent + '%');

      // Load token contract
      App.contracts.RUCToken.deployed().then(function(instance) {
        rucTokenInstance = instance;
        return rucTokenInstance.balanceOf(App.account);
      }).then(function(balance) {
        $('.ructoken-balance').html(balance.toNumber());
        App.loading = false;
        loader.hide();
        content.show();
      })
	});
   },
    buyTokens: function() {
    $('#content').hide();
    $('#loader').show();
    var numberOfTokens = $('#numberOfTokens').val();
    console.log("number of tokens: ",numberOfTokens);
    App.contracts.RUCMarket.deployed().then(function(instance) {
    	console.log("instance address:",instance);
      return instance.buyTokens(numberOfTokens, {
        from: App.account,
        value: numberOfTokens * App.tokenPrice,
        gas: 500000// Gas limit
      });
    }).then(function(result) {
      console.log("Tokens bought...")
      $('form').trigger('reset') // reset number of tokens in form
      // Wait for Sell event
    });
  }
}

$(function() {
  $(window).load(function() {
    App.init();
  })
});