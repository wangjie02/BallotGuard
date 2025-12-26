import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

const QUESTION_COUNT = 5;

task("task:address", "Prints the BallotGuard address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;
  const ballotGuard = await deployments.get("BallotGuard");

  console.log("BallotGuard address is " + ballotGuard.address);
});

task("task:submit", "Submits encrypted answers to BallotGuard")
  .addOptionalParam("address", "Optionally specify the BallotGuard contract address")
  .addOptionalParam(
    "answers",
    "Comma separated list of numeric answers (0-indexed) for all questions. Defaults to 0,1,2,0,3",
  )
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("BallotGuard");
    console.log(`BallotGuard: ${deployment.address}`);

    const signers = await ethers.getSigners();

    const ballotGuardContract = await ethers.getContractAt("BallotGuard", deployment.address);

    const parsedAnswers =
      (taskArguments.answers as string | undefined)?.split(",").map((v) => Number(v.trim())) ??
      [0, 1, 2, 0, 3];

    if (parsedAnswers.length !== QUESTION_COUNT) {
      throw new Error(`Expected ${QUESTION_COUNT} answers, received ${parsedAnswers.length}`);
    }

    const encryptedInput = await fhevm
      .createEncryptedInput(deployment.address, signers[0].address)
      .add8(parsedAnswers[0])
      .add8(parsedAnswers[1])
      .add8(parsedAnswers[2])
      .add8(parsedAnswers[3])
      .add8(parsedAnswers[4])
      .encrypt();

    const tx = await ballotGuardContract
      .connect(signers[0])
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

    console.log(`Wait for tx:${tx.hash}...`);

    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("task:request-results", "Makes a question's tallies public and decrypts them")
  .addOptionalParam("address", "Optionally specify the BallotGuard contract address")
  .addParam("question", "Question index to unlock")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const deployment = taskArguments.address ? { address: taskArguments.address } : await deployments.get("BallotGuard");
    const questionId = Number(taskArguments.question);

    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("BallotGuard", deployment.address);

    const options = await contract.optionsPerQuestion(questionId);
    console.log(`Unlocking results for question ${questionId} with ${options} options`);

    const tx = await contract.connect(signers[0]).requestQuestionResults(questionId);
    console.log(`Wait for tx:${tx.hash}...`);
    await tx.wait();

    for (let optionId = 0; optionId < options; optionId++) {
      const encrypted = await contract.getEncryptedCount(questionId, optionId);
      const clear = await fhevm.userDecryptEuint(
        FhevmType.euint32,
        encrypted,
        deployment.address,
        signers[0],
      );
      console.log(`Option ${optionId}: ${clear.toString()}`);
    }
  });
