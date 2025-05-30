# XMTP Appchain Subgraph

This subgraph indexes events from the XMTP Payer Portal contracts deployed on XMTP Sepolia (appchain). It provides comprehensive data for message tracking, usage analytics, and bridge operations.

## Overview

The appchain subgraph tracks the following contracts:

- **GroupMessageBroadcaster** (`0x8c5908AFbd1a5C25590D78eC7Bb0422262BDE6a1`) - Group message tracking
- **IdentityUpdateBroadcaster** (`0x2c7A0c3856ca0CC9bf339E19fE25ca4c1f57A567`) - Identity update tracking
- **ArbSys** (`0x0000000000000000000000000000000000000064`) - Bridge operations (XMTP → Base)

## Entities

### Core Entities

- `Message` - Individual message records (group messages and identity updates)
- `MessageStats` - Per-user message statistics
- `DailyMessageStats` - Daily user message analytics
- `GlobalMessageStats` - Global message statistics
- `DailyGlobalStats` - Daily global analytics

### Bridge Entities

- `BridgeTransaction` - Cross-chain bridge transactions
- `CrossChainTransaction` - Cross-chain transaction linking
- `NativeUSDCBalance` - Native USDC balance tracking
- `NativeUSDCTransfer` - Native USDC transfer records

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

### Get User Message Statistics

```graphql
query GetUserMessageStats($user: Bytes!) {
  messageStats(id: $user) {
    totalMessages
    totalGroupMessages
    totalIdentityUpdates
    totalCost
    lastMessageAt
    firstMessageAt
  }
}
```

### Get Recent Messages

```graphql
query GetRecentMessages($user: Bytes!, $first: Int!) {
  messages(
    where: { sender: $user }
    orderBy: blockTimestamp
    orderDirection: desc
    first: $first
  ) {
    type
    groupId
    inboxId
    sequenceId
    messageSize
    costAtTime
    blockTimestamp
    transactionHash
  }
}
```

### Get Daily Message Analytics

```graphql
query GetDailyMessageStats($user: Bytes!, $days: Int!) {
  dailyMessageStats(
    where: { payer: $user }
    orderBy: date
    orderDirection: desc
    first: $days
  ) {
    date
    messageCount
    totalCost
    averageCostPerMessage
  }
}
```

### Get Global Statistics

```graphql
query GetGlobalStats {
  globalMessageStats(id: "global") {
    totalMessages
    totalGroupMessages
    totalIdentityUpdates
    totalCost
    uniqueSenders
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
    claimableAt
    sourceTxHash
    initiatedAt
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

### GroupMessageBroadcaster Events

- `MessageSent(bytes32 indexed groupId, bytes message, uint64 indexed sequenceId)`

### IdentityUpdateBroadcaster Events

- `IdentityUpdateCreated(bytes32 indexed inboxId, bytes update, uint64 indexed sequenceId)`

### ArbSys Events

- `L2ToL1Transaction(address caller, address indexed destination, uint256 indexed hash, uint256 indexed position, uint256 arbBlockNum, uint256 ethBlockNum, uint256 timestamp, uint256 callvalue, bytes data)`

## Message Cost Calculation

The subgraph includes a placeholder cost calculation function that estimates message costs based on:

@todo: update from 0.4.0 defaults

- Base fee: 10,000 wei
- Per-byte fee: 1,000 wei per byte

In production, this should be replaced with actual rate queries from the settlement chain's RateRegistry contract.

## Analytics Features

### User Analytics

- Total message count by type
- Cost tracking over time
- First and last message timestamps
- Daily usage patterns

### Global Analytics

- Network-wide message statistics
- Daily aggregated metrics
- Average cost calculations
- Unique sender tracking

## Network Configuration

- **Network**: XMTP Sepolia
- **Chain ID**: 241320161
- **Graph RPC**: https://xmtp-testnet.g.alchemy.com/public
- **Graph Node**: Alchemy or local

## Cross-Chain Integration

This subgraph is designed to work in conjunction with the settlement chain subgraph to provide:

- Complete cross-chain transaction tracking
- Message cost settlement correlation
- Bridge operation monitoring

## Contributing

When adding new features:

1. Update the schema in `schema.graphql`
2. Add event handlers in the appropriate mapping files
3. Update the subgraph manifest in `subgraph.yaml`
4. Run `npm run codegen` to generate types
5. Test thoroughly before deployment

## Performance Considerations

@todo: optimize performance

- Message data can grow rapidly - consider data retention policies
- Daily statistics are pre-aggregated for efficient querying
- Global statistics are updated incrementally to avoid expensive recalculations
