/**
 * Deploy HONESTVerifier to Avalanche
 */

const { ethers } = require('hardhat');

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log('Deploying HONESTVerifier with account:', deployer.address);
  console.log('Account balance:', (await deployer.provider.getBalance(deployer.address)).toString());
  
  const HONESTVerifier = await ethers.getContractFactory('HONESTVerifier');
  const contract = await HONESTVerifier.deploy();
  
  await contract.waitForDeployment();
  
  console.log('✅ HONESTVerifier deployed to:', await contract.getAddress());
  console.log('Transaction hash:', contract.deploymentTransaction().hash);
  
  // Register initial sources
  console.log('\nRegistering oracle sources...');
  
  // Example: Register your backend as authorized oracle
  await contract.registerSource(
    'htp_backend',
    deployer.address,  // Your backend wallet
    100                // Weight
  );
  
  console.log('✅ Deployment complete!');
  console.log('\nAdd this to your .env:');
  console.log(`AVALANCHE_CONTRACT_ADDRESS=${await contract.getAddress()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
