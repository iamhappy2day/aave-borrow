const { getNamedAccounts, ethers, network } = require("hardhat");
const { networkConfig } = require("../helper-hardhat-config");
const chainId = network.config.chainId;
const wethAddress = networkConfig[chainId].wethAddress;
const amount = ethers.utils.parseEther("0.01");

async function getWeth(deployer) {
  const wEthContract = await ethers.getContractAt(
    "IWeth",
    wethAddress,
    deployer
  );
  // call deposit func of weth contract
  const tx = await wEthContract.deposit({ value: amount });
  tx.wait(1);
  const wethBalance = await wEthContract.balanceOf(deployer);
  console.log("wethBalance", wethBalance.toString());
}

module.exports = { getWeth, amount, wethAddress };
