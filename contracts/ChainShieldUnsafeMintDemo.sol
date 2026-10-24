// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ChainShieldUnsafeMintDemo
 * @notice Deliberately vulnerable smart contract created for ChainShield Sentinel security scanner acceptance testing.
 * @dev WARNING: DO NOT USE IN PRODUCTION. This contract contains an intentionally unrestricted mint function.
 */
contract ChainShieldUnsafeMintDemo {
    string public name = "ChainShield Unsafe Mint Demo";
    string public symbol = "CSDEMO";
    uint8 public decimals = 18;

    uint256 public totalSupply;
    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(uint256 initialSupply) {
        owner = msg.sender;
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }

    /**
     * @notice Unrestricted token minting function.
     * @dev VULNERABILITY: This function is externally callable by ANY account without
     * any authorization check, access control modifier, or caller verification.
     * Any caller can arbitrarily increase the total supply and inflate balances.
     * @param to Recipient address for freshly minted tokens.
     * @param amount Number of token units to mint.
     */
    function mint(address to, uint256 amount) external {
        // CRITICAL VULNERABILITY: Missing access control check!
        _mint(to, amount);
    }

    /**
     * @notice Safely protected ownership transfer function.
     * @dev Used to verify that properly protected functions are not falsely flagged.
     * @param newOwner Address of the new contract owner.
     */
    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        require(newOwner != address(0), "Ownable: new owner is zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Standard token transfer.
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        require(to != address(0), "ERC20: transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "ERC20: transfer amount exceeds balance");

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @notice Standard token approval.
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        require(spender != address(0), "ERC20: approve to zero address");
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /**
     * @notice Standard transferFrom with allowance check.
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(from != address(0), "ERC20: transfer from zero address");
        require(to != address(0), "ERC20: transfer to zero address");
        require(balanceOf[from] >= amount, "ERC20: transfer amount exceeds balance");
        require(allowance[from][msg.sender] >= amount, "ERC20: insufficient allowance");

        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;

        emit Transfer(from, to, amount);
        return true;
    }

    /**
     * @notice Allows token holders to burn their own tokens.
     */
    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "ERC20: burn amount exceeds balance");
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }

    /**
     * @dev Internal helper for token minting.
     */
    function _mint(address account, uint256 amount) internal {
        require(account != address(0), "ERC20: mint to zero address");
        totalSupply += amount;
        balanceOf[account] += amount;
        emit Transfer(address(0), account, amount);
    }
}
