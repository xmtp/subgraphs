# XMTP Subgraphs - Claude Context

## Package Manager
**Use `yarn` for all package management operations**, not npm. Both app-chain and settlement-chain subprojects use yarn (yarn.lock files present).

## Project Structure
- `app-chain/` - XMTP Appchain subgraph (tracks group messages, identity updates, cross-chain operations)
- `settlement-chain/` - Base Sepolia settlement chain subgraph (tracks payments, withdrawals, fee tokens)

## Environment Setup
- Node version: v20.19.5+ (engines.node: ">=23.2.0" in package.json)
- Graph CLI: 0.97.1 (for codegen and build)
- Goldsky CLI: 3.1.0+ (for deployment)
- Each subproject has `.env` files with:
  - `VERSION_LABEL`: Semantic version for deployment (e.g., v0.2.5)
  - `GOLDSKY`: API key for Goldsky authentication
  - `PROJECT_ID`: Goldsky project identifier

## Environment Differences

### testnet-staging vs testnet
- **testnet-staging**: Staging environment for testing before production deployment
- **testnet**: Production testnet environment with production-ready contract addresses

Key differences in contract addresses:
- **App-chain**:
  - testnet-staging: GroupMessageBroadcaster `0xdEB68688Fcc514b69078f2cCf0a6D2746548b368`, IdentityUpdateBroadcaster `0xe946A8e2DE66827e1834BA3c24D7f94c98249152`
  - testnet: GroupMessageBroadcaster `0x6619B1c95eb10d339903E4AA9938314d6E711d17`, IdentityUpdateBroadcaster `0xD49DCDd95Ce435eaB2E53DBfcBceF5cAAc78D95a`
- **Settlement-chain**:
  - testnet-staging: PayerRegistry `0x208E94fbC9833B58765fedC30CFF8539C6356e88`
  - testnet: PayerRegistry `0xF0bd6Ac8AA00BA083cF95C5438B33488cbd2562B`

## Common Commands

### Development Workflow (for each subproject):
```bash
# Navigate to specific subproject
cd app-chain  # or settlement-chain

# Install dependencies
yarn install

# Code generation (choose environment)
yarn codegen:testnet-staging  # Staging environment
yarn codegen:testnet          # Production testnet

# Build subgraph
yarn build:testnet-staging    # Staging environment
yarn build:testnet            # Production testnet

# Deploy to Goldsky
yarn deploy:testnet-staging   # Deploys and tags with 'stable'
yarn deploy:testnet           # Deploys and tags with 'stable'
```

### How Deployment Works

Deployments use Goldsky's versioning and tagging system:

1. **Version**: Each deployment has a version (e.g., `v0.2.5`) specified in `.env`
2. **Tag**: A stable tag (`stable`) is automatically created/updated to point to the deployed version
3. **Endpoint**: Frontend always uses the tagged endpoint (e.g., `/stable/gn`), which never changes

**Example**: When you run `yarn deploy:testnet-staging`:
- Deploys `settlement-chain-testnet-staging/v0.2.5`
- Creates/updates tag `stable` to point to `v0.2.5`
- GraphQL endpoint: `https://api.goldsky.com/.../subgraphs/settlement-chain-testnet-staging/stable/gn`

When deploying a new version (e.g., `v0.2.6`):
- Update `VERSION_LABEL=v0.2.6` in `.env`
- Run `yarn deploy:testnet-staging`
- The `stable` tag automatically moves to `v0.2.6`
- Frontend continues using the same endpoint URL

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

### GraphQL Query Endpoints

Use these **stable tagged endpoints** in your frontend applications. These URLs never change, even when deploying new subgraph versions.

#### Settlement-Chain Subgraph (Base Sepolia)
- **testnet-staging**: `https://api.goldsky.com/api/public/project_cmh3prjsr002wr4p22cdshlhh/subgraphs/settlement-chain-testnet-staging/stable/gn`
- **testnet**: `https://api.goldsky.com/api/public/project_cmh3prjsr002wr4p22cdshlhh/subgraphs/settlement-chain-testnet/stable/gn`
- **Network**: base-sepolia
- **Current Version**: v0.2.5

#### App-Chain Subgraph (XMTP Ropsten)
- **testnet-staging**: `https://api.goldsky.com/api/public/project_cmh3prjsr002wr4p22cdshlhh/subgraphs/app-chain-testnet-staging/stable/gn`
- **testnet**: `https://api.goldsky.com/api/public/project_cmh3prjsr002wr4p22cdshlhh/subgraphs/app-chain-testnet/stable/gn`
- **Network**: xmtp-ropsten (Chain ID: 351243127)
- **Current Version**: v0.2.4
- **RPC**: xmtp-ropsten.g.alchemy.com/v2/VB4wowVdpg22Obz-gjoUhGJnGbjC67eN

⚠️ **Important**: Always use the `/stable/gn` tagged endpoints. Never hardcode version numbers in your frontend code.

## Key Configuration Files
- `testnet-staging.yaml` - Staging environment configuration
- `testnet.yaml` - Production testnet configuration
- `.env` - Contains VERSION_LABEL, GOLDSKY API key, and PROJECT_ID

## Deployment Infrastructure
- **Indexer**: Goldsky
- **CLI**: @goldskycom/cli (via yarn)
- **Project ID**: project_cmh3prjsr002wr4p22cdshlhh

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

## Troubleshooting

### App-Chain Custom Network
If you encounter "Subgraph network not supported: no network xmtp-ropsten found" error:
- The xmtp-ropsten network (Chain ID: 351243127) must be configured in Goldsky
- Contact Goldsky support if the network is not available
- Provide: Chain ID 351243127 and RPC endpoint details

### Version Already Exists
If deployment fails with "You've already deployed this subgraph under the name X/vY.Z":
- This typically means the subgraph content hash is identical to an existing deployment
- Either make changes to the subgraph code, or
- Update the `stable` tag to point to the existing version:
  ```bash
  yarn goldsky subgraph tag create <name>/<version> --tag stable --token <API_KEY>
  ```

### Deployment Takes Time
- Initial deployment and indexing can take 10-15 minutes
- The subgraph needs to sync with the blockchain from the startBlock specified in the yaml config
- Check Goldsky dashboard for indexing progress