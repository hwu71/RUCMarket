pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "./RUCToken.sol";
//import "./SafeMath.sol";

contract RUCMarket {
    
  using SafeMath for uint256;

  address payable admin;
  uint256 public tokenPrice;
  uint256 public tokensSold;

  uint requestedProducts;
  uint totalOrderNumber = 0;
  uint totalProductNumber = 0;
  uint totalCourierNumber = 0;
  

  RUCToken token;

  enum State {REQUESTED, PAYED, SELLER_COMFIRMED, SELLER_SENT, 
  BUYER_GOT, COMPLETED, WILL_RETURN, BUYER_SENT, SELLER_GOT, CANCLED}

  struct Order {
    uint id;
    uint productId;
    uint productValue;
    uint deliverFee;
    uint number;
    address seller;
    string sellAddress;
    address buyer;
    string buyerAddress;
    uint courierId;
    State state;
    uint deliverTime; 
  }
  
  struct Product {
    uint id;
    string name;
    uint price;
    uint number;
    //uint unconfirmedRequests;
    address seller;
    string url;
  }
  
  
  struct Courier {
      uint id;
      address accountAddress;
      string companyName;
      string publicKey;
      uint fee;
  }
  
  //mapping (address => AddressInfo) addressTable;
  //mapping (address => bool) registerTable;
  mapping (address => bool) certifiedCourier; // for admin to certify courier
  mapping (address => bool) isCourier;  // for check if a courier double registers

  Product[] public products;
  Order[] orders;
  Courier[] public couriers;
  
 
  event Purchase(uint _productId, uint _price, uint _number, address _seller, address _buyer);
  event TokenSell(address _buyer, uint256 _amount);
  
  constructor(RUCToken _tokenContract, uint256 _tokenPrice) public {
    token = _tokenContract;
    admin = msg.sender;
    tokenPrice = _tokenPrice;
  }
  

/************************ Token Part **************************************************************/

  function buyTokens(uint256 _numberOfTokens) public payable {

    // Require that value is equal to tokens
    require(msg.value == _numberOfTokens.mul(tokenPrice));

    // Require that the contract has enough tokens
    require(token.balanceOf(address(this))>= _numberOfTokens);

    // Require that a transfer is successful
    require(token.transfer(msg.sender, _numberOfTokens));

    // Keep track of tokensSold
    tokensSold += _numberOfTokens;

    // Trigger Sell Event
    emit TokenSell(msg.sender, _numberOfTokens);
  }
  
  
  /************************ Purchase Part **************************************************************/
  
  function addCourier(address _courierAddress) public{
    require(msg.sender == admin);         // only by admin
    certifiedCourier[_courierAddress] = true;
  }

  function courierRegister(string memory _companyName, string memory _publicKey, uint _fee) public {
      require(certifiedCourier[msg.sender]); // require msg.sender to be already certified
      require(!isCourier[msg.sender]); // prevent double register
      
      Courier memory _courier;
      totalCourierNumber = totalCourierNumber.add(1);
      _courier.id = totalCourierNumber; //id = totalCourierNumber 
      _courier.accountAddress = msg.sender;
      _courier.companyName = _companyName;
      _courier.publicKey = _publicKey;
      _courier.fee = _fee;
      
      couriers.push(_courier);
      isCourier[msg.sender] = true;
  }
  
  function addProduct(string memory _name, uint _price, uint _number, string memory _url) public {
    require(_price > 0);
    require(_number > 0);
    
    Product memory _product;
    totalProductNumber = totalProductNumber.add(1);
    _product.id = totalProductNumber; //id = totalProductNumber
    _product.name = _name;
    _product.price = _price;
    _product.number = _number;
    _product.seller = msg.sender;
    _product.url = _url;
    products.push(_product);
  }

  
  function purchaseRequest(uint _productId, uint _requestNumber, uint _courierId) external {
    require(_productId != 0);
    
    //(Product memory _product, uint _productIndex) = findProductAndIndexById(_productId);
    Product memory _product = findProductById(_productId);
    require(_productId == _product.id); //_product does exist
    //require(_courierId > 0 && _courierId <= couriers.length);
    require(_courierId !=0);
    require(_requestNumber != 0 && _requestNumber <= _product.number);
    require((_product.price.mul(_requestNumber)) <= token.balanceOf(msg.sender));
    require(_product.seller != msg.sender); // can not buy things from one himself
    
    Order memory _order;
    totalOrderNumber = totalOrderNumber.add(1);
    _order.id = totalOrderNumber; // order id = totalOrderNumber
    _order.productId = _productId;
    _order.productValue = _product.price.mul(_requestNumber); // number * price 
    Courier memory _courier = findCourierById(_courierId);
    _order.deliverFee = _courier.fee; //deliver fee
    _order.number = _requestNumber;
    _order.seller = _product.seller;
    _order.buyer = msg.sender;
    _order.courierId = _courierId;
    _order.state = State.REQUESTED;

    orders.push(_order);
    
  }
  
  
  function buyerPayOrder(uint _orderId) external {
      require(_orderId !=0);
      
      (Order memory _order,uint _orderIndex) = findOrderAndIndexById(_orderId);
      require(_order.id != 0); // order exist
      
      require(msg.sender == _order.buyer);
      require(_order.state == State.REQUESTED);
      
      uint totalValue = _order.productValue.add(_order.deliverFee); //totalValue = productValue + deliverFee
      token.approve(msg.sender, address(this), totalValue);
      require(token.allowance(msg.sender, address(this)) >= totalValue);
      token.transferFrom(msg.sender, address(this), totalValue);
      orders[_orderIndex].state = State.PAYED;
      
  }
  
  function sellerComfirmOrder(uint _orderId) external {
      require(_orderId != 0);
      (Order memory _order,uint _orderIndex) = findOrderAndIndexById(_orderId);
      require(_order.id != 0); // order exist
      
      require(msg.sender == _order.seller );
      require(_order.state == State.PAYED);  // require preious state
      (Product memory _product,uint _productIndex) = findProductAndIndexById(_order.productId);
      require(_order.number <= _product.number);
      
      
      
      orders[_orderIndex].state = State.SELLER_COMFIRMED; //change state to "..."
      products[_productIndex].number = products[_productIndex].number.sub(_order.number); // update product number
      
      emit Purchase( _order.productId, _product.price, _order.number, _order.seller, _order.buyer);
  }
  
  function sellerSendProduct(uint _orderId, bytes32 _hash, bytes calldata _sig) external {
      require(_orderId != 0);
      (Order memory _order,uint _orderIndex) = findOrderAndIndexById(_orderId);
      require(_order.id != 0); // order exist
      require(msg.sender == _order.seller); //msg.sender == order's seller
      
      Courier memory _courier = findCourierById(_order.courierId);
      require(recover(_hash,_sig) == _courier.accountAddress); // verify signature from courier
      
      require(_order.state == State.SELLER_COMFIRMED); // state == SELLER_COMFIRMED
      
      token.transfer(_courier.accountAddress, _order.deliverFee); // pay deliver fee
      orders[_orderIndex].state = State.SELLER_SENT; //change state to "SELLER_SENT"
  }
  
  function productDeliveredToBuyer(uint _orderId, bytes32 _hash, bytes calldata _sig) external {
      require(_orderId != 0);
      (Order memory _order,uint _orderIndex) = findOrderAndIndexById(_orderId);
      require(_order.id != 0); // order exist
      
      require(recover(_hash,_sig) == _order.buyer); // verify signature from buyer
      
      Courier memory _courier = findCourierById(_order.courierId);
      require(msg.sender == _courier.accountAddress); //msg.sender == order's courier
      
      require(_order.state == State.SELLER_SENT); // require previous state
      
      //token.transferFrom(address(this), _order.seller, _order.productValue);
      orders[_orderIndex].state = State.BUYER_GOT;
      orders[_orderIndex].deliverTime = now; // set the deliverTime as 'now'
  }
  
  function buyerConfirm(uint _orderId) external {
      require(_orderId != 0);
      (Order memory _order,uint _orderIndex) = findOrderAndIndexById(_orderId);
      require(_order.id != 0); // order exist
      
      require(msg.sender == _order.buyer); // msg.sender == buyer
      require(_order.state == State.BUYER_GOT); // require previous state
      
      //token.transferFrom(address(this), _order.seller, _order.productValue);
      token.transfer(_order.seller, _order.productValue);
      orders[_orderIndex].state = State.COMPLETED;
  }
  
  function sellerGetMoneyFromOrder(uint _orderId) external {
      require(_orderId != 0);
      (Order memory _order,uint _orderIndex) = findOrderAndIndexById(_orderId);
      require(_order.id != 0); // order exist
      
      require(msg.sender == _order.seller); //msg.sender == seller
      require(now > _order.deliverTime.add(1 minutes)); // consideration time is over
      require(_order.state == State.BUYER_GOT); // Has't been confirmed
      
      //token.transferFrom(address(this), _order.seller, _order.productValue);
      token.transfer(_order.seller, _order.productValue);
      orders[_orderIndex].state = State.COMPLETED;
  }
  
  function buyerWillRuturnProduct(uint _orderId) external {
      require(_orderId !=0);
      
      (Order memory _order,uint _orderIndex) = findOrderAndIndexById(_orderId);
      require(_order.id != 0); // order exist
      
      require(msg.sender == _order.buyer);
      require(_order.state == State.BUYER_GOT); // state == BUYER_GOT
      require(now <= _order.deliverTime.add(1 minutes)); // within the consideration time limit
      
      token.approve(msg.sender, address(this), _order.deliverFee);
      require(token.allowance(msg.sender, address(this)) >= _order.deliverFee);
      token.transferFrom(msg.sender, address(this), _order.deliverFee);
      orders[_orderIndex].state = State.WILL_RETURN;
      
  }
  
  function buyerSendProduct(uint _orderId, bytes32 _hash, bytes calldata _sig) external {
      require(_orderId != 0);
      (Order memory _order,uint _orderIndex) = findOrderAndIndexById(_orderId);
      require(_order.id != 0); // order exist
      require(msg.sender == _order.buyer); //msg.sender == order's buyer
      
      Courier memory _courier = findCourierById(_order.courierId);
      require(recover(_hash,_sig) == _courier.accountAddress); // verify signature
      
      require(_order.state == State.WILL_RETURN); // state == WILL_RETURN
      
      token.transfer(_courier.accountAddress, _order.deliverFee); // pay deliver fee
      orders[_orderIndex].state = State.BUYER_SENT; //change state to "SELLER_SENT"
  }
  
  function productDeliveredToSeller(uint _orderId, bytes32 _hash, bytes calldata _sig) external {
      require(_orderId != 0);
      (Order memory _order,uint _orderIndex) = findOrderAndIndexById(_orderId);
      require(_order.id != 0); // order exist
      
      require(recover(_hash,_sig) == _order.seller); // verify signature from seller
      
      Courier memory _courier = findCourierById(_order.courierId);
      require(msg.sender == _courier.accountAddress); //msg.sender == order's courier

      require(_order.state == State.BUYER_SENT); // require previous state
      
      //token.transferFrom(address(this), _order.seller, _order.productValue);
      orders[_orderIndex].state = State.SELLER_GOT;
      //orders[_orderIndex].deliverTime = now; // reset the deliverTime as 'now'
      
      //add product number
      uint _productIndex = findProductIndexById(_order.productId);
      products[_productIndex].number = products[_productIndex].number.add(_order.number);
      
      token.transfer(_order.buyer, _order.productValue); // return the money back to buyer
  }
  
  function cancleByBuyer(uint _orderId) external {
      require(_orderId != 0);
      (Order memory _order,uint _orderIndex) = findOrderAndIndexById(_orderId);
      require(_order.id != 0); // order exist
      
      require(msg.sender == _order.buyer); // only buyer call this cancle  
      
      /*two cases:
        1. before seller send products: buyer can get all the money (token) back
        2. after buyer got the products, before he sends 
        (which is state WILL_RETURN): similer to buyerConfirm()*/
      if(_order.state < State.SELLER_SENT) { // 1. before seller sent
          orders[_orderIndex].state = State.CANCLED; // set state as CANCLED
          token.transfer(msg.sender, _order.productValue.add(_order.deliverFee)); // transfer token back
      }
      else if(_order.state == State.WILL_RETURN){
          token.transfer(_order.seller, _order.productValue);
          orders[_orderIndex].state = State.COMPLETED;
      }
  }
  
  function cancleByCourier(uint _orderId) external {
      /* Situation: 
      courier help qulify the product, and the returning products don't match the requirement.
      */
      
      require(_orderId != 0);
      (Order memory _order,uint _orderIndex) = findOrderAndIndexById(_orderId);
      require(_order.id != 0); // order exist
      
      Courier memory _courier = findCourierById(_order.courierId);
      require(msg.sender == _courier.accountAddress); // only courier call this cancle  
      require(_order.state == State.WILL_RETURN);
      
      token.transfer(_order.seller, _order.productValue.add(_order.deliverFee));
      orders[_orderIndex].state = State.COMPLETED;
  }

  /****************************** Find and Get methods***********************************/
    
  function productsNumber() external view returns(uint){
    return products.length;
  }

  function findOrderAndIndexById(uint _orderId) internal view returns(Order memory, uint) {
    for(uint i = 0; i < orders.length; i++) {
       if(orders[i].id == _orderId){
         return (orders[i], i);
       }
    }
    
    Order memory order;
    
    return (order, 0);
  }
  
  function findOrderById(uint _orderid) internal view returns(Order memory){
      for(uint i = 0; i < orders.length; i++){
          if(orders[i].id == _orderid)
            return orders[i];
      }
      
      Order memory order;
      return order;
  }

  function findOrdersBySeller(address _seller) external view returns(Order[] memory) {
    uint count = 0;
    uint i;
    uint j = 0;
    for(i = 0; i < orders.length; i++){
      if(orders[i].seller == _seller){
        count ++;
      }
    }

    Order[] memory results = new Order[](count);

    for(i = 0; i < orders.length; i++){
      if(orders[i].seller == _seller){
        results[j++] = orders[i];
      }
    }

    return results;
  }
  
  function findOrdersByBuyer(address _buyer) external view returns(Order[] memory) {
    uint count = 0;
    uint i;
    uint j = 0;
    for(i = 0; i < orders.length; i++){
      if(orders[i].buyer == _buyer){
        count ++;
      }
    }

    Order[] memory results = new Order[](count);

    for(i = 0; i < orders.length; i++){
      if(orders[i].buyer == _buyer){
        results[j++] = orders[i];
      }
    }
      return results;
  }
  
  function findOrdersBycourierId(uint _courierId) external view returns(Order[] memory) {
    uint count = 0;
    uint i;
    uint j = 0;
    for(i = 0; i < orders.length; i++){
      if(orders[i].courierId == _courierId){
        count ++;
      }
    }

    Order[] memory results = new Order[](count);

    for(i = 0; i < orders.length; i++){
      if(orders[i].courierId == _courierId){
        results[j++] = orders[i];
      }
    }

    return results;
  }



  function findProductAndIndexById(uint _productId) internal view returns(Product memory, uint) {
    for(uint i = 0; i < products.length; i++) {
       if(products[i].id == _productId){
         return (products[i], i);
       }
    }
    
    Product memory product;
    
    return (product, 0);
  }
  
  function findProductIndexById(uint _productId) internal view returns(uint) {
    for(uint i = 0; i < products.length; i++) {
       if(products[i].id == _productId){
         return i;
       }
    }
    
    return 0;
  }
  
  function findProductById(uint _productId) public view returns(Product memory) {
    for(uint i = 0; i < products.length; i++) {
       if(products[i].id == _productId){
         return products[i];
       }
    }
    
    Product memory product;
    
    return product;
  }
  
  function findCourierById(uint _courierId) public view returns(Courier memory) {
    for(uint i = 0; i < couriers.length; i++) {
       if(couriers[i].id == _courierId){
         return couriers[i];
       }
    }
    
    Courier memory courier;
    
    return courier;
  }
/*********************************Verify Signature*****************************************/
  function recover(bytes32 hash, bytes memory signature)
      public
      pure
      returns (address)
    {
      bytes32 r;
      bytes32 s;
      uint8 v;

      // Check the signature length
      if (signature.length != 65) {
        return (address(0));
      }

      // Divide the signature in r, s and v variables
      // ecrecover takes the signature parameters, and the only way to get them
      // currently is to use assembly.
      // solium-disable-next-line security/no-inline-assembly
      assembly {
        r := mload(add(signature, 0x20))
        s := mload(add(signature, 0x40))
        v := byte(0, mload(add(signature, 0x60)))
      }

      // Version of signature should be 27 or 28, but 0 and 1 are also possible versions
      if (v < 27) {
        v += 27;
      }

      // If the version is correct return the signer address
      if (v != 27 && v != 28) {
        return (address(0));
      } else {
        // solium-disable-next-line arg-overflow
        return ecrecover(hash, v, r, s);
      }
    }

}