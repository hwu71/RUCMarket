

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
//var Vue1 = require('Vue');
//console.log(Vue1);
//import Vue from 'vue';
//console.log(Vue);
/*var app2 = new Vue({
  el: '#requestProduct',
  data:{
    productId: 0,
    productPrice: 1,
    productNumber: 1,
    couriers: [],
    seller: '0x0',
    message: 'Hello Vue!'
  },
  methods: {
    
  }
})*/
//var orders = new Array();
App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  loading: false,
  accountLoading: false,
  productsLoading: false,
  ordersLoading: false,
  tokenPrice: 1000000000000000,
  tokensSold: 0,
  tokensAvailable: 750000,
  couriers: new Array(),
  products: new Array(),
  orders: new Array(),
  State: ["REQUESTED", "PAYED", "SELLER_COMFIRMED", "SELLER_SENT", 
  "BUYER_GOT", "COMPLETED", "WILL_RETURN", "BUYER_SENT", "SELLER_GOT", "CANCLED"],
  msg: '0x0',
  signature: '0x0',

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
        App.renderAccount();
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
    
    // Load token sale contract
    App.renderProduct();
    App.renderAccount();
    App.loadCouriers();
    App.loadProducts();
    App.loadOrders();
    //App.viewOrdersAsBuyer();
    //App.viewOrdersAsCourier();
    App.loading = false;
    loader.hide();
    content.show();
  },
  renderAccount: function(){
    App.accountLoading = true;
    var loader = $('#loader');
    var content = $('#accountInfo');
    web3.eth.getCoinbase(function(err, account) {
      if(err === null) {
        App.account = account;
        $('#accountAddress').html("Your Account: " + account);
      }
    })
    App.contracts.RUCToken.deployed().then(function(instance) {
        return instance.balanceOf(App.account);
      }).then(function(balance) {
        $('#ructoken-balance').html("Your RUC Token balance: " + balance.toNumber());
      })
      App.accountLoading = false;
      loader.hide();
      content.show();
  },
  renderToken: function(){
    App.tokenLoading = true;
    var loader  = $('#loader');
    var content = $('#content');
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
        $('#ructoken-balance').html("Your RUC Token balance: " + balance.toNumber());
        App.tokenLoading = false;
        loader.hide();
        content.show();
      })
    });
  },
  renderProduct: function(){
    var productContent = $('#product-content');
    var productTemplate = $('#productTemplate');
    $('#product-content').empty();
    App.contracts.RUCMarket.deployed().then(function(instance){
      //console.log("instance address: ",instance);
      //console.log("instance products:", instance.products);
      return instance.productsNumber().then(function(result){
        var length = result.toNumber();
        //console.log("products number:", result.toNumber());
        for (i = 0; i < length; i ++) {
          instance.products(i).then(function(instance){
            var product = instance;
            //console.log("product:",instance);
            var productId = product[0].toNumber();
            var productName = product[1];
            var productPrice = product[2].toNumber();
            var productNumber = product[3].toNumber();
            var productSeller = product[4];
            //console.log("seller",productSeller)
            var productUrl = product[5];

            productTemplate.find('#productId').text(productId);
            productTemplate.find('#productName').text(productName);
            productTemplate.find('img').attr('src', productUrl);
            productTemplate.find('#productPrice').text(productPrice);
            productTemplate.find('#productRemainingNumber').text(productNumber);
            //productTemplate.find('.productSeller').text(productSeller);
            productTemplate.find('#buyButton').attr('data-id', productId);
            if(productNumber>0){
              productTemplate.find('#buyButton').attr('disabled',false);
            }
            productContent.append(productTemplate.html());
        });
       } 
      })
    })
  },

  addProduct: function(){
    var productName = $('#nameOfProduct').val();
    var productImage = $('#imageOfProduct').val();
    var productPrice = $('#priceOfProduct').val();
    var productNumber = $('#numberOfProduct').val();
    //console.log("productName:",productName);
    //console.log("productImage:",productImage);
    //console.log("productPrice:",productPrice);
    //console.log("productNumber:",productNumber);
    App.contracts.RUCMarket.deployed().then(function(instance){
      //console.log("instance address: ",instance);
      return instance.addProduct(productName, productPrice, productNumber, productImage, {
        from: App.account,
        gas: 500000
      });
    }).then(function(result){
      console.log("Product added...");
      $('form').trigger('reset') // reset the form
    })
  },

  addCourier: function(){
    var courierAddress = $('#courierAddress').val();
    console.log("courier address: ",courierAddress);
    App.contracts.RUCMarket.deployed().then(function(instance) {
      //console.log("instance address:",instance);
      return instance.addCourier(courierAddress, {
        from: App.account,
        gas: 500000
      });
    }).then(function(result){
      console.log("Courier added...")
      $('form').trigger('reset') // reset the form
    })
  },

  courierRegister: function(){
    var companyName = $('#companyName').val();
    //console.log("Courier company name: ", companyName);
    var deliverFee = $('#deliverFee').val();
    //console.log("Courier deliver fee: ",deliverFee);
    var publicKey = $('#publicKey').val();
    //console.log("Courier public key: ",publicKey);
    App.contracts.RUCMarket.deployed().then(function(instance){
      //console.log("instance address:",instance);
      return instance.courierRegister(companyName, publicKey, deliverFee, {
        from: App.account,
        gas: 500000
      });
    }).then(function(result){
      console.log("Courier registered...")
      $('form').trigger('reset')
    })
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
  },

  requestInfo: function(instance) {

    var id = $(instance).attr("data-id");
    //var v1 = $(this).attr("data-id");
    //console.log(v);
    //console.log(v1);
    //console.log('id:',id);
    //var productContent = $('#product-content');
    var requestProductForm = $('#requestProductForm');
    
    $('#requestProductForm').trigger('reset');
    App.contracts.RUCMarket.deployed().then(function(instance){
      //console.log("instance address: ",instance);
      //console.log("instance products:", instance.products);
      //console.log(instance.products(id-1));
      return instance.products(id-1).then(function(product){
        //console.log(product);
        var productPrice = product[2].toNumber();
        var productNumber = product[3].toNumber();
        var productSeller = product[4];
        requestProductForm.find('#idOfProduct').attr('value',id);
        requestProductForm.find('#priceOfProduct').attr('value',productPrice);
        requestProductForm.find('#requestNumber').attr('max',productNumber);
        //console.log(couriers);
        return instance.couriersNumber().then(function(result){
          var couriersNumber = result.toNumber();
          //console.log("couriersNumber: ",couriersNumber);
          var chooseCourier = $('#chooseCourier');
          chooseCourier.empty();   
          for(i = 0;i < couriersNumber;i++){
              //console.log(instance.couriers(i))
              instance.couriers(i).then(function(courier){
                //console.log(courier);
                var courierId = courier[0].toNumber();
                //console.log("courierId:", courierId);
                var companyName = courier[2];
                var deliverFee = courier[4].toNumber();
                var courierInfo = $("<option></option>").text(companyName+"("+deliverFee+")").attr('data-id',courierId).attr('data-fee',deliverFee);
                chooseCourier.append(courierInfo);
              })
          }
        })
      });
    });
  },
  requestProduct: function(instance){
    var idOfProduct = $('#requestProduct').find('#idOfProduct').val();
    //var priceOfProduct = $('#requestProduct').find('#priceOfProduct').val();
    var requestNumber = $('#requestNumber').val();
    var courierId = $('#chooseCourier').find("option:selected").attr("data-id");
    //var deliverFee = $('#chooseCourier').find("option:selected").attr("data-fee");
    console.log(idOfProduct,requestNumber,courierId);
    App.contracts.RUCMarket.deployed().then(function(instance){
      console.log("instance address:",instance);
      instance.purchaseRequest(idOfProduct, requestNumber,courierId,{
        from: App.account,
        gas: 500000
      });
    }).then(function(result){
      console.log("Product requested...")

    })
  },
  Courier: function(_courierId,_accountAddress,_companyName,_publicKey,_deliverFee){
    this.courierId = _courierId;
    this.accountAddress = _accountAddress;
    this.companyName = _companyName;
    this.publicKey = _publicKey;
    this.deliverFee = _deliverFee;
  },
  loadCouriers: function(){
    App,couriers = [];
    App.contracts.RUCMarket.deployed().then(function(instance){
      //console.log(instance);
      return instance.couriersNumber().then(function(result){
        var couriersNumber = result.toNumber();
        //console.log("productsNumber:",productsNumber);
        for(i=0;i<couriersNumber;i++){
          instance.couriers(i).then(function(instance){
            var courierId = instance[0].toNumber();
            var accountAddress = instance[1];
            var companyName = instance[2];
            var publicKey = instance[3];
            var deliverFee = instance[4].toNumber();
            var courier = new App.Courier(courierId,accountAddress,companyName,publicKey,deliverFee);
            //App.products[i] = product;
            //console.log(courier);
            App.couriers.push(courier);
          })

        }
      })
    })
  },

  Product: function(_productId,_productName,_productPrice,_productNumber,_productSeller,_productUrl){
    this.productId = _productId;
    this.productName = _productName;
    this.productPrice = _productPrice;
    this.productNumber = _productNumber;
    this.productSeller = _productSeller;
    this.productUrl = _productUrl;
  },

  loadProducts: function(){
    App.products = [];
    App.contracts.RUCMarket.deployed().then(function(instance){
      console.log(instance);
      return instance.productsNumber().then(function(result){
        var productsNumber = result.toNumber();
        //console.log("productsNumber:",productsNumber);
        for(i=0;i<productsNumber;i++){
          instance.products(i).then(function(instance){
            var productId = instance[0].toNumber();
            var productName = instance[1];
            var productPrice = instance[2].toNumber();
            var productNumber = instance[3].toNumber();
            var productSeller = instance[4];
            var productUrl = instance[5];
            var product = new App.Product(productId,productName,productPrice,productNumber,productSeller,productUrl);
            //App.products[i] = product;
            //console.log(product);
            App.products.push(product);
          })

        }
      })
    })
  },
  Order: function(_orderId,_productId,_productValue,_deliverFee,_productNumber,_seller,_sellerAddress,_buyer,_buyerAddress,_courierId,_state,_deliverTime){
    this.orderId=_orderId;
    this.productId=_productId;
    this.productValue = _productValue;
    this.deliverFee = _deliverFee;
    this.productNumber=_productNumber;
    this.seller = _seller;
    this.sellerAddress = _sellerAddress;
    this.buyer = _buyer;
    this.buyerAddress = _buyerAddress;
    this.courierId=_courierId;
    this.state = _state;
    this.deliverTime = _deliverTime;
  },
  loadOrders: function(){
    App.orders = [];
    App.contracts.RUCMarket.deployed().then(function(instance){
      console.log("instance address:",instance);
      return instance.ordersNumber().then(function(result){
        var ordersNumber = result;
        //console.log(ordersNumber);
        for(i=0;i<ordersNumber;i++){
          instance.orders(i).then(function(instance){
            var orderId = instance[0].toNumber();
            var productId= instance[1].toNumber();
            var productValue=instance[2].toNumber();
            var deliverFee=instance[3].toNumber();
            var productNumber=instance[4].toNumber();
            var seller=instance[5];
            var sellerAddress = instance[6];
            var buyer = instance[7];
            var buyerAddress = instance[8];
            var courierId=instance[9].toNumber();
            var state=instance[10].toNumber();
            var deliverTime = instance[11].toNumber();
            var order = new App.Order(orderId,productId,productValue,deliverFee,productNumber,seller,sellerAddress,buyer,buyerAddress,courierId,state,deliverTime);
            //console.log("order:",order);
            //App.orders[i] = order;
            App.orders.push(order);
            //console.log("orders:",App.orders);
          })
        }
      })
      
    })
  },
  viewOrdersAsBuyer: function(){
    $('#user-orders-content').find('#buyerOrSeller').text("Seller");
    var userOrderTbody=$('#userOrderTbody');
    userOrderTbody.empty();
    //var orderTemplate=$('#orderTemplate');
    for(i=0;i<App.orders.length;i++){

      var order = App.orders[i];
      //console.log(order);
      if(App.account === order.buyer){
        var productName = App.products[order.productId-1].productName;
        //console.log("productName",productName);
        var deliverCompany = App.couriers[order.courierId-1].companyName;
        //console.log("deliverCompany:",deliverCompany);
        var totalFee = order.productValue + order.deliverFee;
        //console.log("totalfee:", totalFee);
        var state = App.State[order.state];
        //console.log("state:",state);
        var mtr =$("<tr></tr>");
        var orderIdTd = $("<td></td>").text(order.orderId);
        var productIdTd = $("<td></td>").text(order.productId);
        var productNameTd = $("<td></td>").text(productName);
        var productNumberTd = $("<td></td>").text(order.productNumber);
        var deliverCompanyTd = $("<td></td>").text(deliverCompany);
        var sellerTd = $("<td></td>").text(order.seller);
        var totalFeeTd = $("<td></td>").text(totalFee);
        var stateTd = $("<td></td>").text(state);
        var optionTd = $("<td></td>");
        /*var buttonTd = $("<button></button>").text("Options");
        buttonTd.attr("type","button").attr("class","btn-primary").attr('data-id',order.orderId);
        buttonTd.attr("data-toggle","modal").attr("data-target","#orderOptions");*/
        var button = $('#buyerOptionButton');
        button.find('button').attr("data-id",order.orderId);
        //button.find('button').attr("data-target","#buyerOrderOptions");
        optionTd.append(button.html());
        //console.log(button.html());
        //console.log(button)
        mtr.append(orderIdTd);
        mtr.append(productIdTd);
        mtr.append(productNameTd);
        mtr.append(productNumberTd);
        mtr.append(deliverCompanyTd);
        mtr.append(sellerTd);
        mtr.append(totalFeeTd);
        mtr.append(stateTd);
        mtr.append(optionTd);
        userOrderTbody.append(mtr);
        //console.log(userOrderTbody.html())
      }
      
    }
  },
  viewOrdersAsSeller: function(){
    $('#user-orders-content').find('#buyerOrSeller').text("Buyer");
    var userOrderTbody=$('#userOrderTbody');
    userOrderTbody.empty();
    //var orderTemplate=$('#orderTemplate');
    for(i=0;i<App.orders.length;i++){
      var order = App.orders[i];
      //console.log(order);
      if(App.account === order.seller){
        var productName = App.products[order.productId-1].productName;
        //console.log("productName",productName);
        var deliverCompany = App.couriers[order.courierId-1].companyName;
        //console.log("deliverCompany:",deliverCompany);
        var totalFee = order.productValue + order.deliverFee;
        //console.log("totalfee:", totalFee);
        var state = App.State[order.state];
        //console.log("state:",state);
        var mtr =$("<tr></tr>");
        var orderIdTd = $("<td></td>").text(order.orderId);
        var productIdTd = $("<td></td>").text(order.productId);
        var productNameTd = $("<td></td>").text(productName);
        var productNumberTd = $("<td></td>").text(order.productNumber);
        var deliverCompanyTd = $("<td></td>").text(deliverCompany);
        var buyerTd = $("<td></td>").text(order.buyer);
        var totalFeeTd = $("<td></td>").text(totalFee);
        var stateTd = $("<td></td>").text(state);
        var optionTd = $("<td></td>");
        var button = $('#sellerOptionButton');
        button.find('button').attr("data-id",order.orderId);
        //button.find('button').attr("data-target","#sellerOrderOptions");
        optionTd.append(button.html());
        mtr.append(orderIdTd);
        mtr.append(productIdTd);
        mtr.append(productNameTd);
        mtr.append(productNumberTd);
        mtr.append(deliverCompanyTd);
        mtr.append(buyerTd);
        mtr.append(totalFeeTd);
        mtr.append(stateTd);
        mtr.append(optionTd);
        userOrderTbody.append(mtr);
        //console.log(userOrderTbody.html())
      }
    }
  },
  viewOrdersAsCourier: function(){
    //$('#courier-orders-content').
    var courierOrderTbody=$('#courierOrderTbody');
    courierOrderTbody.empty();
   //var orderTemplate=$('#orderTemplate');
    for(i=0;i<App.orders.length;i++){

      var order = App.orders[i];
      var courierAccount = App.couriers[order.courierId-1].accountAddress;
      console.log(order);
      if(App.account === courierAccount){
        
        var state = App.State[order.state];
        console.log("state:",state);
        var mtr =$("<tr></tr>");
        var orderId = $("<td></td>").text(order.orderId); 
        var seller = $("<td></td>").text(order.seller);
        var sellerInfo = $("<td></td>").text(order.sellerAddress);
        var buyer = $("<td></td>").text(order.buyer);
        var buyerInfo = $("<td></td>").text(order.buyerAddress);
        var state = $("<td></td>").text(state);
        var optionTd = $("<td></td>");
        var button = $('#courierOptionButton');
        button.find('button').attr("data-id",order.orderId);
        //button.find('button').attr("data-target","#courierOrderOptions");
        optionTd.append(button.html());
        //console.log(button.html());
        //console.log(button)
        mtr.append(orderId);
        mtr.append(seller);
        mtr.append(sellerInfo);
        mtr.append(buyer);
        mtr.append(buyerInfo);
        mtr.append(state);
        mtr.append(optionTd);
        courierOrderTbody.append(mtr);
        console.log(courierOrderTbody.html())
      }   
    }
  },
  loadInfoForPay: function(){
    var orderId = $('#buyerOrderOptions').attr('data-id');
    console.log("orderId:",orderId);
    var payOrderModal = $('#payOrderModal');
    var totalFee = App.orders[orderId-1].productValue + App.orders[orderId-1].deliverFee; 
    payOrderModal.find('#orderId').val(orderId);
    payOrderModal.find('#totalFee').val(totalFee);
  },

  buyerPay: function(){
    var orderId = $('#buyerOrderOptions').attr('data-id');
    var payOrderModal = $('#payOrderModal');
    var name = payOrderModal.find('#realName').val();
    var phoneNumber = payOrderModal.find('#phoneNumber').val();
    var addressInfo = payOrderModal.find('#addressInfo').val();
    var zipCode = payOrderModal.find('#zipCode').val();
    var string = name + "|" + phoneNumber + "|" + addressInfo + "|" + zipCode;
    //console.log(string);

    var publicKey = App.couriers[App.orders[orderId-1].courierId - 1].publicKey;
    //console.log(publicKey);
    var encryptObject = new JSEncrypt();
    encryptObject.setPublicKey(publicKey);
    var encryptedString = encryptObject.encrypt(string);
    //console.log(encryptedString);
    App.contracts.RUCMarket.deployed().then(function(instance){
      return instance.buyerPayOrder(orderId, encryptedString,{
        from: App.account,
        gas: 500000
      })
    }).then(function(result){
      console.log("Buyer payed...",result);

    })
  },
  loadInfoForConfirmRequest: function(){
    var orderId = $('#sellerOrderOptions').attr('data-id');
    //console.log("orderId:",orderId);
    var confirmRequestModal = $('#confirmRequest');
    //var totalFee = App.orders[orderId-1].productValue + App.orders[orderId-1].deliverFee; 
    var productId = App.orders[orderId-1].productId;
    var requestNumber = App.orders[orderId-1].productNumber;
    confirmRequestModal.find('#orderId').val(orderId);
    confirmRequestModal.find('#productId').val(productId);
    confirmRequestModal.find('#requestNumber').val(requestNumber);
  },

  sellerConfirm: function(){
    var orderId = $('#sellerOrderOptions').attr('data-id');
    var confirmRequestModal = $('#confirmRequest');
    var name = confirmRequestModal.find('#realName').val();
    var phoneNumber = confirmRequestModal.find('#phoneNumber').val();
    var addressInfo = confirmRequestModal.find('#addressInfo').val();
    var zipCode = confirmRequestModal.find('#zipCode').val();
    var string = name + "|" + phoneNumber + "|" + addressInfo + "|" + zipCode;
    //console.log(string);

    var publicKey = App.couriers[App.orders[orderId-1].courierId - 1].publicKey;
    //console.log(publicKey);
    var encryptObject = new JSEncrypt();
    encryptObject.setPublicKey(publicKey);
    var encryptedString = encryptObject.encrypt(string);
    //console.log(encryptedString);
    App.contracts.RUCMarket.deployed().then(function(instance){
      return instance.sellerConfirmOrder(orderId, encryptedString,{
        from: App.account,
        gas: 500000
      })
    }).then(function(result){
      console.log("Seller confirmed...",result);

    })
  },

  sellerSent: function(){
    var orderId = $('#sellerOrderOptions').attr('data-id');
    var sellerSent = $('#sellerSent');
    //var hash = sellerSent.find('#hashedMessage').val();
    //var sig = sellerSent.find('#signature').val();
    //hash = 0xf43e5b8e9fbda3e9c08f71edc309a51e78055e79ffdfe551dfaf4d6deea2e39a;
    //sig = 0x29fae03093833b2371ed268a6a7b3738be42a9078addaeffe894e58f8d3f4a9a33dea4d91efe8718337ee4305c18ace94d7b6ea91df92fbfc479b9310416f8801c;
    //console.log(hash,sig);
    //console.log(web3.utils.fromAscii(hash));
    App.contracts.RUCMarket.deployed().then(function(instance){
      return instance.sellerSendProduct(orderId,App.msg,App.signature,{
        from: App.account,
        gas: 500000
      })
    }).then(function(result){
      console.log("Seller sent order...",result);
    })
  },
  deliveredToBuyer: function(){
    var orderId = $('#courierOrderOptions').attr('data-id');
    App.contracts.RUCMarket.deployed().then(function(instance){
      return instance.productDeliveredToBuyer(orderId,App.msg,App.signature,{
        from:App.account,
        gas:500000
      })
    }).then(function(result){
      console.log("Order delivered to buyer...",result);
    })
  },
  /*sellerSentOrder: function(){
    var orderId = $('#sellerOrderOptions').attr('data-id');
    var courierAccount = App.couriers[App.orders[orderId-1].courierId-1].accountAddress;
    console.log('courierAccount',courierAccount);
    const message = web3.sha3("Seller Sent");
    console.log('message', message);

    web3.eth.sign(courierAccount, message, function(err, result){
      console.log(err,result);
      App.msg = message;
      App.signature = result;
    })
    App.contracts.RUCMarket.deployed().then(function(instance){
      console.log(App.msg,App.signature);
      return instance.sellerSendProduct(orderId,App.msg,App.signature, {
        from: App.account,
        gas: 500000
      }).then(function(result){
        console.log("Seller sent order...",result);
      })
    })
  },*/
  buyerConfirmOrder: function(){
    var orderId = $('#buyerOrderOptions').attr('data-id');
    App.contracts.RUCMarket.deployed().then(function(instance){
      return instance.buyerConfirm(orderId,{
        from:App.account,
        gas: 500000
      })
    }).then(function(result){
      console.log("Buyer confirmed order...",result);
    })
  },
  signMessage: function(){
    $("#content").hide();
    $("#loader").show();

    const message = web3.sha3( $('#message').val() )
    console.log('message', message)

    web3.eth.sign(App.account, message, function (err, result) {
      console.log(err, result)
      $('form').trigger('reset')
      App.msg = message
      $('#msg').html('message:' + ' ' + message)
      App.signature = result
      $('#signature').html('signature:' + ' ' + result)
      $("#content").show();
      $("#loader").hide();
      window.alert('Message signed!')
    })
  }
  

}

$(function() {
  $(window).load(function() {
    App.init();
  })
});