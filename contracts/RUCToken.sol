pragma solidity ^0.5.0;

import "./SafeMath.sol";

contract RUCToken {
    using SafeMath for uint256;
	string public name = "RUC Token";
	string public symbol = "RUC";
	string public standard = "RUC Token v1.0";
	uint256 public totalSupply;

	event Transfer(
		address indexed _from,
		address indexed _to,
		uint256 _value
	);

	event Approval(
		address indexed _owner,
		address indexed _spender,
		uint256 _value
	);

	mapping(address => uint256) public balanceOf;
	mapping(address => mapping(address => uint256)) public allowance;

	constructor (uint256 _initialSupply) public {
		balanceOf[msg.sender] = _initialSupply;
		totalSupply = _initialSupply;		
	}

	function transfer(address  _to, uint256 _value) public returns (bool success) {
		// Exception if account doesn't have enough
		require(balanceOf[msg.sender] >= _value);

		balanceOf[msg.sender] = balanceOf[msg.sender].sub(_value);
		balanceOf[_to] = balanceOf[_to].add(_value);

		emit Transfer(msg.sender, _to, _value);

		return true;
	}
	
	function approve(address _owner, address _spender, uint256 _value) public returns (bool success) {
	    require(_spender != address(0));
	    
		allowance[_owner][_spender] += _value;
		emit Approval(_owner, _spender, _value);
		return true;
	}

    /*function ApproveFrom(address _owner,address _spender, uint256 _value ) public returns (bool success){
        allowance[_owner][_spender] = _value;

		emit Approval(_owner, _spender, _value);

		return true;
    }*/
    
	function transferFrom(address _from, address  _to, uint256 _value) public returns (bool success) {
		require(_value <= balanceOf[_from]);
		require(_value <= allowance[_from][msg.sender]);
        require(_to != address(0));
        
		balanceOf[_from] = balanceOf[_from].sub(_value);
		balanceOf[_to] = balanceOf[_to].add(_value);

		allowance[_from][msg.sender] = allowance[_from][msg.sender].sub(_value);

		emit Transfer(_from, _to, _value);

		return true;
	}
}