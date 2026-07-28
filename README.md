# XMTP Subgraphs

![XMTP Banner](.github/xmtp-banner.png)

This repository contains subgraphs for event listening of XMTP smart contracts related to payer services. This indexed data can be consumed by apps, enabling real-time UI updates, historical data analysis, and overall enhanced user experience without directly querying raw blockchain data.

## Key Technologies

-   **[The Graph Protocol](https://thegraph.com/)**: Decentralized indexing protocol for organizing blockchain data.
-   **[Graph CLI](https://github.com/graphprotocol/graph-cli)**: Command-line interface for developing and deploying subgraphs.
-   **[AssemblyScript](https://www.assemblyscript.org/)**: A TypeScript-like language compiled to WebAssembly, used for writing subgraph mapping logic.
-   **[Goldsky](https://goldsky.com/)**: Hosted service currently used for subgraph deployment and querying (see CLAUDE.md for endpoint details). Note: `appchain-contracts/` and `settlement-chain-contracts/` contain an earlier, unmaintained Alchemy-based prototype and are not the active deployment target.

## Repository Structure

This monorepo is organized into two primary subgraph projects, one for each target chain type (settlement chain and appchain):

```text
.
├── settlement-chain-contracts/ # Subgraph for Base
│   ├── abis/                   # Contract ABI files
│   ├── src/                    # AssemblyScript mapping handlers
│   ├── <environment>.yaml      # Subgraph manifest for a specific environment
│   ├── schema.graphql          # GraphQL schema for entities
│   ├── .env                    # API key and version label
│   └── package.json            # Build and deployment scripts
├── appchain-contracts/         # Subgraph for XMTP Appchain
│   ├── abis/
│   ├── src/
│   ├── <environment>.yaml
│   ├── schema.graphql
│   ├── .env
│   └── package.json
└── README.md
```

Each directory (`app-chain` and `settlement-chain`) contains a self-contained subgraph project, including its schema, ABIs, mapping logic, and scripts.

## Getting Started

### Prerequisites

-   Node.js
-   npm or Yarn (Yarn recommended for `workspaces`)

### Setup

1.  **Clone the repository:**

```bash
git clone https://github.com/xmtp/subgraphs.git
cd subgraphs
```

2.  **Install dependencies:**

In each project directory, run:

```bash
npm install
# or
yarn install
```

3.  **Configure Environment Variables:** Create a `.env` file in the relevant subgraph project (`app-chain` or `settlement-chain`) and add your Goldsky API key, project ID, and a version label:

```text
GOLDSKY=YOUR_GOLDSKY_API_KEY
PROJECT_ID=YOUR_GOLDSKY_PROJECT_ID
VERSION_LABEL=v0.3.0
```

## Development Workflow

TODO

## Querying Data

Once your subgraphs are deployed and synced, you can query their data using GraphQL. Goldsky provides a stable, tagged GraphQL API endpoint for each deployed subgraph (see `CLAUDE.md` for the current endpoint URLs). Always use the `/stable/gn` tagged endpoint rather than a versioned one.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
