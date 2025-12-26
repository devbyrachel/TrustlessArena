import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { TrustlessArena, TrustlessArena__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("TrustlessArena")) as TrustlessArena__factory;
  const arena = (await factory.deploy()) as TrustlessArena;
  const arenaAddress = await arena.getAddress();
  return { arena, arenaAddress };
}

describe("TrustlessArena", function () {
  let signers: Signers;
  let arena: TrustlessArena;
  let arenaAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ arena, arenaAddress } = await deployFixture());
  });

  it("join initializes gold to 1000 and soldier to 0", async function () {
    await (await arena.connect(signers.alice).join()).wait();

    const encryptedGold = await arena.getEncryptedGold(signers.alice.address);
    const gold = await fhevm.userDecryptEuint(FhevmType.euint64, encryptedGold, arenaAddress, signers.alice);
    expect(gold).to.eq(1000);

    const encryptedSoldier = await arena.getEncryptedBuiltSoldierType(signers.alice.address);
    const soldier = await fhevm.userDecryptEuint(FhevmType.euint8, encryptedSoldier, arenaAddress, signers.alice);
    expect(soldier).to.eq(0);
  });

  it("cannot join twice", async function () {
    await (await arena.connect(signers.alice).join()).wait();
    await expect(arena.connect(signers.alice).join()).to.be.revertedWithCustomError(arena, "AlreadyJoined");
  });

  it("cannot build before joining", async function () {
    const encryptedType = await fhevm.createEncryptedInput(arenaAddress, signers.alice.address).add8(1).encrypt();
    await expect(arena.connect(signers.alice).buildSoldier(encryptedType.handles[0], encryptedType.inputProof)).to.be
      .revertedWithCustomError(arena, "NotJoined");
  });

  it("build type 2 spends 200 gold and stores type 2", async function () {
    await (await arena.connect(signers.alice).join()).wait();

    const encryptedType = await fhevm.createEncryptedInput(arenaAddress, signers.alice.address).add8(2).encrypt();
    await (await arena.connect(signers.alice).buildSoldier(encryptedType.handles[0], encryptedType.inputProof)).wait();

    const encryptedGold = await arena.getEncryptedGold(signers.alice.address);
    const gold = await fhevm.userDecryptEuint(FhevmType.euint64, encryptedGold, arenaAddress, signers.alice);
    expect(gold).to.eq(800);

    const encryptedSoldier = await arena.getEncryptedBuiltSoldierType(signers.alice.address);
    const soldier = await fhevm.userDecryptEuint(FhevmType.euint8, encryptedSoldier, arenaAddress, signers.alice);
    expect(soldier).to.eq(2);
  });

  it("invalid soldier type does not change state", async function () {
    await (await arena.connect(signers.alice).join()).wait();

    const encryptedInvalidType = await fhevm.createEncryptedInput(arenaAddress, signers.alice.address).add8(9).encrypt();
    await (await arena.connect(signers.alice).buildSoldier(encryptedInvalidType.handles[0], encryptedInvalidType.inputProof)).wait();

    const encryptedGold = await arena.getEncryptedGold(signers.alice.address);
    const gold = await fhevm.userDecryptEuint(FhevmType.euint64, encryptedGold, arenaAddress, signers.alice);
    expect(gold).to.eq(1000);

    const encryptedSoldier = await arena.getEncryptedBuiltSoldierType(signers.alice.address);
    const soldier = await fhevm.userDecryptEuint(FhevmType.euint8, encryptedSoldier, arenaAddress, signers.alice);
    expect(soldier).to.eq(0);
  });

  it("not enough gold prevents build", async function () {
    await (await arena.connect(signers.alice).join()).wait();

    const encryptedType4 = await fhevm.createEncryptedInput(arenaAddress, signers.alice.address).add8(4).encrypt();
    await (await arena.connect(signers.alice).buildSoldier(encryptedType4.handles[0], encryptedType4.inputProof)).wait();

    const encryptedType1 = await fhevm.createEncryptedInput(arenaAddress, signers.alice.address).add8(1).encrypt();
    await (await arena.connect(signers.alice).buildSoldier(encryptedType1.handles[0], encryptedType1.inputProof)).wait();

    const encryptedGold = await arena.getEncryptedGold(signers.alice.address);
    const gold = await fhevm.userDecryptEuint(FhevmType.euint64, encryptedGold, arenaAddress, signers.alice);
    expect(gold).to.eq(0);

    const encryptedSoldier = await arena.getEncryptedBuiltSoldierType(signers.alice.address);
    const soldier = await fhevm.userDecryptEuint(FhevmType.euint8, encryptedSoldier, arenaAddress, signers.alice);
    expect(soldier).to.eq(4);
  });
});

