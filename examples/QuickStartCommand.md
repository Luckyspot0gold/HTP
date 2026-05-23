# 1. Deploy contract
cd contracts
npm install
npx hardhat run deploy.js --network avalancheFuji

# 2. Install dependencies
cd ..
npm install

# 3. Set environment
cp .env.example .env
# Edit .env with your deployed contract address

# 4. Run server
npm run dev

# 5. Test
curl http://localhost:3000/api/delayed/btc    # Free tier
# Paid tier requires x402 payment (see docs)
