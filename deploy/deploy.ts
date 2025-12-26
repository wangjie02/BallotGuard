import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const optionCounts = [3, 4, 3, 2, 4];

  const deployedSurvey = await deploy("BallotGuard", {
    from: deployer,
    args: [optionCounts],
    log: true,
  });

  console.log(`BallotGuard contract: `, deployedSurvey.address);
};
export default func;
func.id = "deploy_ballotGuard"; // id required to prevent reexecution
func.tags = ["BallotGuard"];
