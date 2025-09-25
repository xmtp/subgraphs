# XMTP Subgraphs - Claude Context

## Package Manager
**Use `yarn` for all package management operations**, not npm. Both app-chain and settlement-chain subprojects use yarn (yarn.lock files present).

## Project Structure
- `app-chain/` - XMTP Appchain subgraph (tracks group messages, identity updates, cross-chain operations)
- `settlement-chain/` - Base Sepolia settlement chain subgraph (tracks payments, withdrawals, fee tokens)

## Environment Setup
- Node version: v20.19.5+ (engines.node: ">=23.2.0" in package.json)
- Graph CLI: 0.97.1
- Each subproject has `.env` files with DEPLOY_KEY and VERSION_LABEL

## Environment Differences

### testnet-dev vs testnet
- **testnet-dev**: Development environment with test contract addresses, used for active development
- **testnet**: Production testnet environment with different (production-ready) contract addresses
- **testnet-staging**: Intermediate staging environment (settlement-chain only)

Key differences in contract addresses:
- **App-chain**: Only has testnet-dev config (single environment)
- **Settlement-chain**: Has all three environments with different PayerRegistry addresses:
  - testnet-dev: `0x77a9129Cb584DF076a64A995dDEF9158d589D80c`
  - testnet: `0x2B019EAfE0910a16394D78f3E930bB4c946B5E9e`

## Common Commands

### Development Workflow (for each subproject):
```bash
# Navigate to specific subproject
cd app-chain  # or settlement-chain

# Install dependencies
yarn install

# Code generation (choose environment)
yarn codegen:testnet-dev    # Development environment
yarn codegen:testnet-staging  # Staging (settlement-chain only)
yarn codegen:testnet        # Production testnet

# Build subgraph
yarn build:testnet-dev      # Development environment
yarn build:testnet-staging  # Staging (settlement-chain only)
yarn build:testnet         # Production testnet

# Deploy to Alchemy hosted service
yarn deploy:testnet-dev     # Development environment
yarn deploy:testnet-staging # Staging (settlement-chain only)
yarn deploy:testnet        # Production testnet
```

### Local Development:
```bash
# Create local subgraph
yarn create-local

# Deploy to local Graph Node
yarn deploy-local

# Remove local subgraph
yarn remove-local
```

## Deployment Configuration

### Query Endpoints
Use these **stable endpoints** that automatically point to the latest promoted version:

#### App-Chain Subgraph (testnet-dev):
- **Stable Endpoint**: https://subgraph.satsuma-prod.com/ephemerahq/app-chain-testnet-dev/api
- **Network**: xmtp-ropsten
- **Config**: testnet-dev.yaml

#### Settlement-Chain Subgraph (testnet-dev):
- **Stable Endpoint**: https://subgraph.satsuma-prod.com/ephemerahq/settlement-chain-testnet-dev/api
- **Network**: base-sepolia
- **Config**: testnet-dev.yaml

### Environment-specific Endpoints
- **testnet-dev**: Currently active development environment (endpoints above)
- **testnet-staging**: https://subgraph.satsuma-prod.com/ephemerahq/settlement-chain-testnet-staging/api (settlement-chain only)
- **testnet**: https://subgraph.satsuma-prod.com/ephemerahq/settlement-chain-testnet/api (settlement-chain only)

⚠️ **Important**: Always use the stable endpoints (without `/version/xxx`) for integration. Version-specific URLs change with each deployment.

## Key Configuration Files
- `testnet-dev.yaml` - Development environment configuration
- `testnet-staging.yaml` - Staging environment configuration
- `testnet.yaml` - Production testnet configuration
- `.env` - Contains DEPLOY_KEY and VERSION_LABEL

## Deployment Infrastructure
- **IPFS**: https://ipfs.satsuma.xyz
- **Deploy Node**: https://subgraphs.alchemy.com/api/subgraphs/deploy
- **Hosted Service**: Alchemy Subgraphs (Satsuma)

## Data Tracked

### App-Chain:
- Group messages (count, bytes, fees)
- Identity updates (creation, fees)
- Cross-chain deposits received
- Withdrawals to settlement chain
- Parameter configuration changes
- Account-level usage snapshots

### Settlement-Chain:
- Payer deposits and balances
- Withdrawal requests/cancellations/finalizations
- Usage settlement batches
- Fee token transfers, minting, burning
- Cross-chain bridge operations
- Account-level financial snapshots

## Testing
```bash
# Run tests
yarn test

# Format code
yarn prettier
```

## Recent Deployment Notes
- Successfully deployed both subgraphs on Sep 16, 2025
- Using version label: v0.1.1-testnet
- Subgraphs are ready for funding portal integration
- May take 10-15 minutes for initial sync after deployment