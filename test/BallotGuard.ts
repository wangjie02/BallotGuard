import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { BallotGuard, BallotGuard__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";

const OPTION_COUNTS = [3, 4, 3, 2, 4];

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("BallotGuard")) as BallotGuard__factory;
  const contract = (await factory.deploy(OPTION_COUNTS)) as BallotGuard;
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

async function encryptAnswers(contractAddress: string, signer: HardhatEthersSigner, answers: number[]) {
  const input = fhevm.createEncryptedInput(contractAddress, signer.address);
  answers.forEach((value) => input.add8(value));
  return input.encrypt();
}

async function decryptCounts(
  contract: BallotGuard,
  contractAddress: string,
  signer: HardhatEthersSigner,
  questionId: number,
) {
  const optionCount = await contract.optionsPerQuestion(questionId);
  const results: bigint[] = [];

  for (let optionId = 0; optionId < optionCount; optionId++) {
    const encrypted = await contract.getEncryptedCount(questionId, optionId);
    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encrypted,
      contractAddress,
      signer,
    );
    results.push(clearValue);
  }

  return results;
}

describe("BallotGuard", function () {
  let signers: Signers;
  let contract: BallotGuard;
  let contractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, contractAddress } = await deployFixture());
  });

  it("starts with uninitialized encrypted counts", async function () {
    const optionConfig = await Promise.all(
      [...Array(OPTION_COUNTS.length).keys()].map(async (i) => Number(await contract.optionsPerQuestion(i))),
    );
    expect(optionConfig).to.deep.eq(OPTION_COUNTS);

    const encryptedCount = await contract.getEncryptedCount(0, 0);
    expect(encryptedCount).to.eq(ethers.ZeroHash);
  });

  it("tallies encrypted answers and unlocks requested question", async function () {
    const answers = [1, 2, 1, 0, 3];
    const encrypted = await encryptAnswers(contractAddress, signers.alice, answers);

    const tx = await contract.connect(signers.alice).submitResponses(
      [
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.handles[2],
        encrypted.handles[3],
        encrypted.handles[4],
      ],
      encrypted.inputProof,
    );
    await tx.wait();

    const requestTx = await contract.connect(signers.alice).requestQuestionResults(0);
    await requestTx.wait();

    const counts = await decryptCounts(contract, contractAddress, signers.alice, 0);
    expect(counts.length).to.eq(OPTION_COUNTS[0]);
    expect(counts[1]).to.eq(1n);
    expect(counts[0]).to.eq(0n);
  });

  it("prevents duplicate submissions", async function () {
    const answers = [0, 1, 2, 0, 3];
    const encrypted = await encryptAnswers(contractAddress, signers.alice, answers);

    await contract.connect(signers.alice).submitResponses(
      [
        encrypted.handles[0],
        encrypted.handles[1],
        encrypted.handles[2],
        encrypted.handles[3],
        encrypted.handles[4],
      ],
      encrypted.inputProof,
    );

    const encryptedRepeat = await encryptAnswers(contractAddress, signers.alice, answers);

    await expect(
      contract.connect(signers.alice).submitResponses(
        [
          encryptedRepeat.handles[0],
          encryptedRepeat.handles[1],
          encryptedRepeat.handles[2],
          encryptedRepeat.handles[3],
          encryptedRepeat.handles[4],
        ],
        encryptedRepeat.inputProof,
      ),
    ).to.be.revertedWithCustomError(contract, "AlreadyParticipated");
  });

  it("aggregates counts across multiple participants", async function () {
    const aliceAnswers = [1, 3, 0, 1, 2];
    const bobAnswers = [2, 0, 1, 0, 3];

    const aliceEncrypted = await encryptAnswers(contractAddress, signers.alice, aliceAnswers);
    await contract.connect(signers.alice).submitResponses(
      [
        aliceEncrypted.handles[0],
        aliceEncrypted.handles[1],
        aliceEncrypted.handles[2],
        aliceEncrypted.handles[3],
        aliceEncrypted.handles[4],
      ],
      aliceEncrypted.inputProof,
    );

    const bobEncrypted = await encryptAnswers(contractAddress, signers.bob, bobAnswers);
    await contract.connect(signers.bob).submitResponses(
      [
        bobEncrypted.handles[0],
        bobEncrypted.handles[1],
        bobEncrypted.handles[2],
        bobEncrypted.handles[3],
        bobEncrypted.handles[4],
      ],
      bobEncrypted.inputProof,
    );

    await contract.connect(signers.deployer).requestQuestionResults(4);

    const counts = await decryptCounts(contract, contractAddress, signers.deployer, 4);
    expect(counts.length).to.eq(OPTION_COUNTS[4]);
    expect(counts[2]).to.eq(1n);
    expect(counts[3]).to.eq(1n);
  });
});
