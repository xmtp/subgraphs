# XMTP App Chain Subgraph

This subgraph indexes events from the XMTP contracts on the app chain.

## Overview

The app chain subgraph tracks the following contracts:

- **GroupMessageBroadcaster**
- **IdentityUpdateBroadcaster**

## Setup

1. Install dependencies:

```bash
npm install
```

2. Generate code from schema and ABIs:

```bash
npm run codegen:<environment>
```

3. Build the subgraph:

```bash
npm run build:<environment>
```

4. Deploy to The Graph Studio:

```bash
npm run deploy:<environment>
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
