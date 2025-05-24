# XMTP Subgraphs

![XMTP Banner](.github/xmtp-banner.png)

This repository contains subgraphs for event listening of XMTP smart contracts related to payer services. This indexed data can be consumed by apps, enabling real-time UI updates, historical data analysis, and overall enhanced user experience without directly querying raw blockchain data.

## Key Technologies

- **[The Graph Protocol](https://thegraph.com/)**: Decentralized indexing protocol for organizing blockchain data.
- **[Graph CLI](https://github.com/graphprotocol/graph-cli)**: Command-line interface for developing and deploying subgraphs.
- **[AssemblyScript](https://www.assemblyscript.org/)**: A TypeScript-like language compiled to WebAssembly, used for writing subgraph mapping logic.
- **[Alchemy Subgraphs](https://www.alchemy.com/subgraphs)**: Hosted service for subgraph deployment and querying.

## Repository Structure

This monorepo is organized into two primary subgraph projects, one for each target blockchain:

```text
.
├── settlement-chain-contracts/ # Subgraph for Base
│   ├── abis/                   # Contract ABI files
│   ├── src/                    # AssemblyScript mapping handlers
│   ├── subgraph.yaml           # Subgraph manifest
│   └── schema.graphql          # GraphQL schema for entities
├── appchain-contracts/         # Subgraph for XMTP Appchain
│   ├── abis/
│   ├── src/
│   ├── subgraph.yaml
│   └── schema.graphql
├── .env                        # API keys and version
├── networks.json               # Custom network config
├── package.json                # Root package.json with monorepo scripts
└── README.md
```

Each directory (`settlement-chain-contracts` and `appchain-contracts`) contains a self-contained subgraph project, including its schema, ABIs, and mapping logic.

## Getting Started

### Prerequisites

- Node.js
- npm or Yarn (Yarn recommended for `workspaces`)
- [Graph CLI](https://github.com/graphprotocol/graph-cli): Install globally:

```bash
npm install -g @graphprotocol/graph-cli
# or
yarn global add @graphprotocol/graph-cli
```

### Setup

1.  **Clone the repository:**

```bash
git clone [https://github.com/your-username/your-subgraphs-repo.git](https://github.com/your-username/your-subgraphs-repo.git)
cd your-subgraphs-repo
```

2.  **Install dependencies:**

```bash
npm install
# or
yarn install
```

3.  **Configure Environment Variables:** Create a `.env` file in the project root and add your Alchemy deploy key and a version label:

```text
DEPLOY_KEY=YOUR_ALCHEMY_DEPLOY_KEY
VERSION_LABEL=v1.0.0 # e.g., v1.0.0 or CI/CD version
```

4.  **Configure Custom Networks:** Ensure `networks.json` in the project root correctly defines the XMTP Appchain Sepolia's RPC endpoint and chain ID.

    ```json
    {
      "base-sepolia": {
        "dataSource": {
          "address": {
            "ArbitrumBridgeProxy": "0xd06d8E471F0EeB1bb516303EdE399d004Acb1615"
          }
        }
      },
      "xmtp-appchain-sepolia": {
        "graphRpc": "<appchain-rpc-url>",
        "chainId": 241320161,
        "dataSource": {
          "address": {
            "IdentityUpdateBroadcasterProxy": "0x0000000000000000000000000000000000000000"
          }
        }
      }
    }
    ```

> **Note:** The `dataSource.address` object is not the source of truth for contract addresses, and is simply a convenience for running `codegen`. Current deployment addresses should be maintained in `subgraph.yaml` files.

## Development Workflow

### 1. Define Schema

- For each subgraph, define your data entities in `schema.graphql` within its respective directory. Entities should typically have an `id: ID!` field and represent the data you want to query.

### 2. Prepare ABIs & Manifest

- Place the necessary ABI JSON files for each contract (using the proxy ABI for upgradable contracts) into the `abis/` directory of the relevant subgraph project.
- Edit `subgraph.yaml` in each project to declare data sources for all contracts you wish to index, including their addresses, ABIs, and event handlers.
  - **Crucial for Undeployed Contracts**: For contracts not yet deployed, use placeholder addresses like `"0x000..."` and `startBlock: 0`. **These must be updated with actual addresses and deployment block numbers upon contract deployment.**

### 3. Generate Code

This step generates AssemblyScript types from your `schema.graphql` and contract ABIs, enabling type-safe mappings. Run from the root directory:

```bash
npm run codegen # or yarn codegen
# This runs:
# npm run codegen:base-sepolia
# npm run codegen:xmtp-appchain-sepolia
```

### 4. Implement Mappings

Write your AssemblyScript mapping functions in `src/mappings/*.ts` within each subgraph directory. These functions process blockchain events and transform them into entities defined in your `schema.graphql`.

### 5. Build Subgraphs

Compile your subgraphs to WebAssembly. Run from the root directory:

```bash
npm run build # or yarn build
# This runs:
# npm run build:base-sepolia
# npm run build:xmtp-appchain-sepolia
```

### 6. Deploy Subgraphs

Before deploying, create corresponding subgraph projects on Alchemy's Subgraph hosting platform and note down their unique slugs.
Deploy from the root directory:

**Base Sepolia Subgraph:**

```bash
npm run deploy:base-sepolia
# Replace <YOUR_BASE_SEPOLIA_SUBGRAPH_SLUG> with your actual slug.
```

**XMTP Appchain Sepolia Subgraph:**

```bash
npm run deploy:xmtp-appchain-sepolia
# Replace <YOUR_XMTP_APPCHAIN_SUBGRAPH_SLUG> with your actual slug.
```

Upon successful deployment, The Graph Node will begin indexing data from the specified `startBlock` for each data source. Subsequent deployments with changes to `subgraph.yaml` or mappings will create new versions of your existing subgraph on Alchemy.

## Querying Data

Once your subgraphs are deployed and synced, you can query their data using GraphQL. Alchemy provides a dedicated GraphQL API endpoint for each deployed subgraph. You can find this endpoint on your subgraph's dashboard in the Alchemy UI.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
