import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { TrustlessArena } from "../types";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("TrustlessArenaSepolia", function () {
  let signers: Signers;
  let arena: TrustlessArena;
  let arenaAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const deployment = await deployments.get("TrustlessArena");
      arenaAddress = deployment.address;
      arena = await ethers.getContractAt("TrustlessArena", deployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("join, build, and decrypt", async function () {
    steps = 12;

    this.timeout(4 * 40000);

    progress(
      `Call TrustlessArena.hasJoined(${signers.alice.address}) arena=${arenaAddress}...`,
    );
    const joined = await arena.hasJoined(signers.alice.address);

    if (!joined) {
      progress(`Call TrustlessArena.join() arena=${arenaAddress}...`);
      const tx = await arena.connect(signers.alice).join();
      await tx.wait();
    }

    progress(`Read TrustlessArena.getEncryptedGold(${signers.alice.address})...`);
    const encryptedGoldBefore = await arena.getEncryptedGold(signers.alice.address);
    const clearGoldBefore = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedGoldBefore,
      arenaAddress,
      signers.alice,
    );
    progress(`Clear gold before build=${clearGoldBefore}`);

    progress("Encrypting soldier type 2...");
    const encryptedType = await fhevm.createEncryptedInput(arenaAddress, signers.alice.address).add8(2).encrypt();

    progress(`Call TrustlessArena.buildSoldier(2) arena=${arenaAddress}...`);
    const tx2 = await arena.connect(signers.alice).buildSoldier(encryptedType.handles[0], encryptedType.inputProof);
    await tx2.wait();

    progress(`Read TrustlessArena.getEncryptedBuiltSoldierType(${signers.alice.address})...`);
    const encryptedSoldier = await arena.getEncryptedBuiltSoldierType(signers.alice.address);
    const clearSoldier = await fhevm.userDecryptEuint(FhevmType.euint8, encryptedSoldier, arenaAddress, signers.alice);
    progress(`Clear soldier after build=${clearSoldier}`);
    expect(clearSoldier).to.eq(2);

    progress(`Read TrustlessArena.getEncryptedGold(${signers.alice.address})...`);
    const encryptedGoldAfter = await arena.getEncryptedGold(signers.alice.address);
    const clearGoldAfter = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedGoldAfter,
      arenaAddress,
      signers.alice,
    );
    progress(`Clear gold after build=${clearGoldAfter}`);
    expect(clearGoldBefore - clearGoldAfter).to.eq(200);
  });
});
