// SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
pragma solidity ^0.8.0;

interface IWeth is IERC20 {
    function deposit() external payable;

    function withdraw(uint256) external;
}
