import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("arena:address", "Prints the TrustlessArena address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;
  const deployment = await deployments.get("TrustlessArena");
  console.log("TrustlessArena address is " + deployment.address);
});

task("arena:join", "Calls join() on TrustlessArena")
  .addOptionalParam("address", "Optionally specify the TrustlessArena contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("TrustlessArena");
    console.log(`TrustlessArena: ${deployment.address}`);

    const [signer] = await ethers.getSigners();
    const arena = await ethers.getContractAt("TrustlessArena", deployment.address);

    const tx = await arena.connect(signer).join();
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("arena:build", "Calls buildSoldier() on TrustlessArena")
  .addOptionalParam("address", "Optionally specify the TrustlessArena contract address")
  .addParam("type", "The soldier type id (1-4)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    const soldierType = parseInt(taskArguments.type);
    if (!Number.isInteger(soldierType)) {
      throw new Error(`Argument --type is not an integer`);
    }

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("TrustlessArena");
    console.log(`TrustlessArena: ${deployment.address}`);

    const [signer] = await ethers.getSigners();
    const arena = await ethers.getContractAt("TrustlessArena", deployment.address);

    const encryptedType = await fhevm.createEncryptedInput(deployment.address, signer.address).add8(soldierType).encrypt();

    const tx = await arena.connect(signer).buildSoldier(encryptedType.handles[0], encryptedType.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("arena:decrypt-gold", "Decrypts encrypted gold for signer")
  .addOptionalParam("address", "Optionally specify the TrustlessArena contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("TrustlessArena");
    console.log(`TrustlessArena: ${deployment.address}`);

    const [signer] = await ethers.getSigners();
    const arena = await ethers.getContractAt("TrustlessArena", deployment.address);

    const encryptedGold = await arena.getEncryptedGold(signer.address);
    if (encryptedGold === ethers.ZeroHash) {
      console.log(`encrypted gold: ${encryptedGold}`);
      console.log("clear gold    : 0");
      return;
    }

    const clearGold = await fhevm.userDecryptEuint(FhevmType.euint64, encryptedGold, deployment.address, signer);
    console.log(`encrypted gold: ${encryptedGold}`);
    console.log(`clear gold    : ${clearGold}`);
  });

task("arena:decrypt-soldier", "Decrypts last built soldier type for signer")
  .addOptionalParam("address", "Optionally specify the TrustlessArena contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("TrustlessArena");
    console.log(`TrustlessArena: ${deployment.address}`);

    const [signer] = await ethers.getSigners();
    const arena = await ethers.getContractAt("TrustlessArena", deployment.address);

    const encryptedSoldier = await arena.getEncryptedBuiltSoldierType(signer.address);
    if (encryptedSoldier === ethers.ZeroHash) {
      console.log(`encrypted soldier: ${encryptedSoldier}`);
      console.log("clear soldier    : 0");
      return;
    }

    const clearSoldier = await fhevm.userDecryptEuint(FhevmType.euint8, encryptedSoldier, deployment.address, signer);
    console.log(`encrypted soldier: ${encryptedSoldier}`);
    console.log(`clear soldier    : ${clearSoldier}`);
  });

