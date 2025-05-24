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
- [Graph CLI](https://github.com/graphprotocol/graph-cli) installed globally:

```bash
npm install -g @graphprotocol/graph-cli
# or
yarn global add @graphprotocol/graph-cli
```

### Setup

1.  **Clone the repository:**

```bash
git clone https://github.com/xmtp/subgraphs.git
cd subgraphs
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
VERSION_LABEL=v0.3.0 # XMTP contract version or subgraph commit
```

## Development Workflow

### Adding a New Network

1.  **Update `networks.json`:** Add a new entry in the `networks.json` file with the network's RPC endpoint and chain ID. Ensure the `dataSource.address` field contains a placeholder address.

    ```json
    {
      "new-network-name": {
        "graphRpc": "<new-network-rpc-url>",
        "chainId": <new-network-chain-id>,
        "dataSource": {
          "address": {
            "ContractName": "0x0000000000000000000000000000000000000000"
          }
        }
      }
    }
    ```

2.  **Update `subgraph.yaml`:** In the relevant subgraph project (`settlement-chain-contracts` or `appchain-contracts`), add a new data source to the `subgraph.yaml` file, referencing the network name defined in `networks.json`. Specify the contract address (can be a placeholder initially) and the block number to start indexing from.

    ```yaml
    dataSources:
      - kind: ethereum/contract
        name: ContractName
        network: new-network-name
        source:
          address: '0x0000000000000000000000000000000000000000'
          abi: ContractName
          startBlock: 0
        mapping:
          kind: ethereum/events
          apiVersion: 0.0.7
          language: wasm/assemblyscript
          entities:
            - EntityName
          abis:
            - name: ContractName
              file: ./abis/ContractName.json
          eventHandlers:
            - event: EventName(address,uint256)
              handler: handleEventName
          file: ./src/mappings/mappings.ts
    ```

3.  **Run codegen and build:** Run `npm run codegen` and `npm run build` to generate the necessary code and build the subgraph.

### Adding a New Contract

1.  **Add the ABI:** Place the contract's ABI JSON file into the `abis/` directory of the relevant subgraph project.

2.  **Update `subgraph.yaml`:** Add a new data source to the `subgraph.yaml` file, specifying the contract's address, ABI, and the block number to start indexing from. If the contract is not yet deployed, use a placeholder address and `startBlock: 0`. Remember to update these values after deployment.

    ```yaml
    dataSources:
      - kind: ethereum/contract
        name: ContractName
        network: network-name # e.g., base-sepolia or xmtp-appchain-sepolia
        source:
          address: '0xContractAddress'
          abi: ContractName
          startBlock: <deployment_block_number>
        mapping:
          kind: ethereum/events
          apiVersion: 0.0.7
          language: wasm/assemblyscript
          entities:
            - EntityName
          abis:
            - name: ContractName
              file: ./abis/ContractName.json
          eventHandlers:
            - event: EventName(address,uint256)
              handler: handleEventName
          file: ./src/mappings/mappings.ts
    ```

3.  **Implement Mappings:** Write AssemblyScript mapping functions in `src/mappings/*.ts` to handle events emitted by the new contract.

4.  **Run codegen and build:** Run `npm run codegen` and `npm run build` to generate the necessary code and build the subgraph.

> **Note on Proxy Contracts:**
>
> - The `source.address` should be the address of the **proxy deployment**
> - The `source.abi` should be the ABI of the **implementation deployment**

### Deploying a New Subgraph Version

1.  **Update `subgraph.yaml` and/or Mappings:** Make the necessary changes in either the `subgraph.yaml` file (e.g., updating contract addresses or adding new event handlers) or by updating the mapping functions in the `src/mappings/` directory.

2.  **Build the Subgraph:** Run `npm run build` (or `yarn build`) from the root directory to compile your subgraph to WebAssembly.

3.  **Deploy the New Version:** Use the deploy scripts, ensuring you have the correct subgraph slug and Alchemy deploy key. A new version of your subgraph will be created on Alchemy.

    ```bash
    npm run deploy:base-sepolia
    # Replace <YOUR_BASE_SEPOLIA_SUBGRAPH_SLUG> with your actual slug.

    npm run deploy:xmtp-appchain-sepolia
    # Replace <YOUR_XMTP_APPCHAIN_SUBGRAPH_SLUG> with your actual slug.
    ```

    Subsequent deployments with changes to `subgraph.yaml` or mappings will create new versions of your existing subgraph on Alchemy.

## Querying Data

Once your subgraphs are deployed and synced, you can query their data using GraphQL. Alchemy provides a dedicated GraphQL API endpoint for each deployed subgraph. You can find this endpoint on your subgraph's dashboard in the Alchemy UI.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
