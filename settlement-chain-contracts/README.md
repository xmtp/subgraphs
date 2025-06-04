# XMTP Settlement Chain Subgraph

This subgraph indexes events from the XMTP Payer Portal contracts deployed on Base Sepolia (settlement chain). It provides comprehensive data for balance tracking, transaction history, rate management, and bridge operations.

## Overview

The settlement chain subgraph tracks the following contracts:

- **PayerRegistry** (`0x95E856F1542EB9Eb1BFB6019f0D438584b1652ed`) - Balance and transaction tracking
- **RateRegistry** (`0xe9Fb03945475587B03eA28b8118E2bc5B753E3E9`) - Rate management
- **Erc20Inbox** (`0xd06d8E471F0EeB1bb516303EdE399d004Acb1615`) - Bridge operations (Base → XMTP)

## Entities

### Core Entities

- `PayerBalance` - Current and historical balance information
- `PayerRegistryTransaction` - All payer registry transactions
- `PendingWithdrawal` - Active withdrawal requests
- `RateUpdate` - Rate change history
- `CurrentRate` - Latest rate information
- `BridgeTransaction` - Cross-chain bridge transactions

### Analytics Entities

- `DailyStats` - Daily aggregated statistics
- `USDCTransfer` - USDC token transfers
- `USDCBalance` - USDC balance tracking
- `CrossChainTransaction` - Cross-chain transaction linking

## Setup

1. Install dependencies:

```bash
npm install
```

2. Generate code from schema and ABIs:

```bash
npm run codegen
```

3. Build the subgraph:

```bash
npm run build
```

4. Deploy to The Graph Studio:

```bash
npm run deploy
```

## Key Queries

### Get User Balance Information

```graphql
query GetUserBalances($user: Bytes!) {
  payerBalance(id: $user) {
    currentBalance
    totalDeposited
    totalWithdrawn
    totalUsageSettled
  }

  pendingWithdrawal(id: $user) {
    amount
    withdrawableTimestamp
    status
  }
}
```

### Get Transaction History

```graphql
query GetTransactionHistory($user: Bytes!, $first: Int!, $skip: Int!) {
  payerRegistryTransactions(
    where: { payer: $user }
    orderBy: blockTimestamp
    orderDirection: desc
    first: $first
    skip: $skip
  ) {
    type
    amount
    blockTimestamp
    transactionHash
  }
}
```

### Get Current Rates

```graphql
query GetCurrentRates {
  currentRate(id: "current") {
    messageFee
    storageFee
    congestionFee
    totalCostPerMessage
    lastUpdated
  }
}
```

### Get Bridge Transactions

```graphql
query GetBridgeTransactions($user: Bytes!) {
  bridgeTransactions(
    where: { user: $user }
    orderBy: initiatedAt
    orderDirection: desc
  ) {
    direction
    amount
    status
    sourceTxHash
    targetTxHash
    initiatedAt
    completedAt
  }
}
```

## Development

### Local Development

For local development with a Graph Node:

```bash
# Create local subgraph
npm run create-local

# Deploy to local node
npm run deploy-local
```

### Testing

Run tests using Matchstick:

```bash
npm run test
```

## Contract Events Tracked

### PayerRegistry Events

- `Deposit(address indexed payer, uint96 amount)`
- `WithdrawalRequested(address indexed payer, uint96 amount, uint32 withdrawableTimestamp)`
- `WithdrawalCancelled(address indexed payer)`
- `WithdrawalFinalized(address indexed payer)`
- `UsageSettled(address indexed payer, uint96 amount)`

### RateRegistry Events

- `RatesUpdated(uint64 messageFee, uint64 storageFee, uint64 congestionFee, uint64 targetRatePerMinute)`

### Erc20Inbox Events

- `InboxMessageDelivered(uint256 indexed messageNum, bytes data)`
- `InboxMessageDeliveredFromOrigin(uint256 indexed messageNum)`

## Network Configuration

- **Network**: Base Sepolia
- **Chain ID**: 84532
- **Graph Node**: Alchemy or local

## Contributing

When adding new features:

1. Update the schema in `schema.graphql`
2. Add event handlers in the appropriate mapping files
3. Update the subgraph manifest in `subgraph.yaml`
4. Run `npm run codegen` to generate types
5. Test thoroughly before deployment
