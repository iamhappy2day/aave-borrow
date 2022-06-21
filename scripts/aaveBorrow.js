const { ethers, getNamedAccounts, network } = require("hardhat");
const { getWeth, amount, wethAddress } = require("./getWeth");
const { networkConfig } = require("../helper-hardhat-config");

const chainId = network.config.chainId;
const lendingPoolAddrProvider = networkConfig[chainId].lendingPoolAddrProvider;
const daiAddress = networkConfig[chainId].daiAddress;
const ethDaiContractAddress = networkConfig[chainId].ethDaiContractAddress;
let lendingPoolAddress;
let lendingPoolContract;

async function main() {
  const { deployer } = await getNamedAccounts();

  // Change ETH to wEth
  await getWeth(deployer);

  // Work with Aave protocol
  await getLendingPoolAddress(deployer);

  // Deposit to Aave lending pool
  await approveErc20(wethAddress, deployer, lendingPoolAddress, amount);
  await depositToLendingPool(deployer);

  // Borrow from Aave
  const availableETHToBorrow = await getUserBorrowInfo(deployer);
  const daiPrice = await getDaiPrice();

  // * 0.9 because we don't to borrow 100% of avaliable DAI to borrow
  const amountOfDaiToBorrow =
    availableETHToBorrow.toString() * 0.9 * (1 / daiPrice.toNumber());

  const amountOfDaiToBorrowInWei = ethers.utils.parseEther(
    amountOfDaiToBorrow.toString()
  );

  // Borrow Dai
  await borrowDai(
    daiAddress,
    lendingPoolContract,
    amountOfDaiToBorrowInWei,
    deployer
  );

  // Repay all borrowed Dai
  await repay(
    amountOfDaiToBorrowInWei,
    daiAddress,
    lendingPoolContract,
    deployer
  );
}

// Lending pool address we get from Lending pool addresses provider smart contract
async function getLendingPoolAddress(deployer) {
  const LPAProviderContract = await ethers.getContractAt(
    "ILendingPoolAddressesProvider", // from @aave node modules
    lendingPoolAddrProvider,
    deployer
  );
  lendingPoolAddress = await LPAProviderContract.getLendingPool();
}

async function depositToLendingPool(deployer) {
  lendingPoolContract = await ethers.getContractAt(
    "ILendingPool", // from @aave node modules
    lendingPoolAddress,
    deployer
  );
  await lendingPoolContract.deposit(wethAddress, amount, deployer, 0);
}

// Approve function for default ERC-20 token
async function approveErc20(erc20Address, from, to, amount) {
  const erc20Contract = await ethers.getContractAt(
    "IERC20", // from Open Zeppelin
    erc20Address,
    from
  );
  const tx = await erc20Contract.approve(to, amount);
  tx.wait(1);
}

async function getUserBorrowInfo(userAddress) {
  const { totalCollateralETH, totalDebtETH, availableBorrowsETH } =
    await lendingPoolContract.getUserAccountData(userAddress);
  return availableBorrowsETH;
}

async function getDaiPrice() {
  const ethDaiContract = await ethers.getContractAt(
    "AggregatorV3Interface",
    ethDaiContractAddress
  );
  const ethDaiPrice = (await ethDaiContract.latestRoundData())[1];
  return ethDaiPrice;
}

async function borrowDai(
  daiAddress,
  lendingPoolContract,
  amountToBorrowInWei,
  account
) {
  const tx = await lendingPoolContract.borrow(
    daiAddress,
    amountToBorrowInWei,
    1,
    0,
    account
  );
  tx.wait(1);
}

async function repay(amount, daiAddress, lendingPoolContract, account) {
  const tx = await approveErc20(
    daiAddress,
    account,
    lendingPoolContract.address,
    amount
  );
  const txRepay = await lendingPoolContract.repay(
    daiAddress,
    amount,
    1,
    account
  );
  txRepay.wait(1);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });
