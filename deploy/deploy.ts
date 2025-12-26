import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  if (!deployer) {
    throw new Error("Missing deployer account. Set PRIVATE_KEY in .env for Sepolia deployments.");
  }

  const deployedTrustlessArena = await deploy("TrustlessArena", {
    from: deployer,
    log: true,
  });

  console.log(`TrustlessArena contract: `, deployedTrustlessArena.address);
};
export default func;
func.id = "deploy_trustless_arena"; // id required to prevent reexecution
func.tags = ["TrustlessArena"];
