import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { deployments, ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { BallotGuard } from "../types";

async function decryptQuestionCounts(
  contract: BallotGuard,
  contractAddress: string,
  signer: HardhatEthersSigner,
  questionId: number,
) {
  const optionCount = await contract.optionsPerQuestion(questionId);
  const counts: bigint[] = [];

  for (let optionId = 0; optionId < optionCount; optionId++) {
    const encrypted = await contract.getEncryptedCount(questionId, optionId);
    const clearValue = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encrypted,
      contractAddress,
      signer,
    );
    counts.push(clearValue);
  }

  return counts;
}

describe("BallotGuardSepolia", function () {
  let signer: HardhatEthersSigner;
  let contract: BallotGuard;
  let contractAddress: string;
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
      const ballotDeployment = await deployments.get("BallotGuard");
      contractAddress = ballotDeployment.address;
      contract = (await ethers.getContractAt("BallotGuard", ballotDeployment.address)) as BallotGuard;
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const signers: HardhatEthersSigner[] = await ethers.getSigners();
    signer = signers[0];
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("submits an encrypted response and observes a single count increase", async function () {
    steps = 12;
    const targetQuestion = 0;
    const targetOption = 1;

    this.timeout(4 * 40000);

    progress(`Requesting current results for question ${targetQuestion}...`);
    let tx = await contract.connect(signer).requestQuestionResults(targetQuestion);
    await tx.wait();

    progress("Decrypting baseline counts...");
    const countsBefore = await decryptQuestionCounts(contract, contractAddress, signer, targetQuestion);
    const currentCount = countsBefore[targetOption] ?? 0n;

    progress("Encrypting answers 1,0,0,0,0...");
    const encryptedInput = await fhevm
      .createEncryptedInput(contractAddress, signer.address)
      .add8(targetOption)
      .add8(0)
      .add8(0)
      .add8(0)
      .add8(0)
      .encrypt();

    progress("Submitting encrypted answers...");
    tx = await contract
      .connect(signer)
      .submitResponses(
        [
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.handles[3],
          encryptedInput.handles[4],
        ],
        encryptedInput.inputProof,
      );
    await tx.wait();

    progress(`Requesting updated results for question ${targetQuestion}...`);
    tx = await contract.connect(signer).requestQuestionResults(targetQuestion);
    await tx.wait();

    progress("Decrypting updated counts...");
    const countsAfter = await decryptQuestionCounts(contract, contractAddress, signer, targetQuestion);

    expect(countsAfter.length).to.be.greaterThan(targetOption);
    expect(countsAfter[targetOption]).to.eq(currentCount + 1n);
  });
});
