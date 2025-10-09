# Git Flow for Subgraphs

This document describes the branch-based deployment strategy for the subgraphs project, which mirrors the funding-portal and smart-contracts git flow.

## Overview

The subgraphs repository uses a **branch-based deployment flow** that corresponds to smart contract environments and frontend deployments. Each branch deploys to a specific subgraph instance on Alchemy/Satsuma.

## Branch Structure

### `testnet-staging` (Development Branch)

- **Purpose**: Primary development branch for all new features and schema changes
- **Deploys To**:
  - `app-chain-testnet-staging`
  - `settlement-chain-testnet-staging`
- **Smart Contracts**: Uses testnet-staging contract addresses
- **Frontend**: Used by `funding-portal/testnet-staging` branch
- **Merge Strategy**: All feature branches merge here first

### `testnet` (Production Testnet)

- **Purpose**: Production-ready testnet subgraphs
- **Deploys To**:
  - `app-chain-testnet`
  - `settlement-chain-testnet`
- **Smart Contracts**: Uses testnet (production testnet) contract addresses
- **Frontend**: Used by `funding-portal/testnet` branch
- **Merge Strategy**: Manual promotion from `testnet-staging` after testing

### `mainnet` (Production)

- **Purpose**: Production mainnet subgraphs
- **Deploys To**:
  - `app-chain-mainnet`
  - `settlement-chain-mainnet`
- **Smart Contracts**: Uses mainnet contract addresses
- **Frontend**: Used by `funding-portal/mainnet` branch
- **Merge Strategy**: Manual promotion from `testnet` after thorough testing

## Repository Structure

- `app-chain/` - XMTP Appchain subgraph
- `settlement-chain/` - Base settlement chain subgraph

Each subproject has its own:
- `testnet-staging.yaml` - Configuration for testnet-staging
- `testnet.yaml` - Configuration for testnet (production testnet)
- `mainnet.yaml` - Configuration for mainnet (when ready)
- `.env` - Contains `DEPLOY_KEY` and `VERSION_LABEL`

## Workflow

### Feature Development

1. **Create Feature Branch**

   ```bash
   # Start from testnet-staging
   git checkout testnet-staging
   git pull origin testnet-staging
   git checkout -b feature/your-feature-name
   ```

2. **Make Schema or Mapping Changes**

   Edit schema and mappings in the relevant subproject(s).

3. **Test Locally**

   ```bash
   cd app-chain  # or settlement-chain

   # Generate code and build
   yarn codegen:testnet-staging
   yarn build:testnet-staging

   # Run tests if available
   yarn test
   ```

4. **Create Pull Request**
   - Target branch: `testnet-staging`
   - Ensure all checks pass
   - Get code review approval

5. **Merge and Deploy to Testnet-Staging**

   After merging to `testnet-staging`:

   ```bash
   git checkout testnet-staging
   git pull origin testnet-staging

   # Deploy app-chain
   cd app-chain
   yarn deploy:testnet-staging

   # Deploy settlement-chain
   cd ../settlement-chain
   yarn deploy:testnet-staging
   ```

   The subgraphs will be available at:
   - `https://subgraph.satsuma-prod.com/.../app-chain-testnet-staging/api`
   - `https://subgraph.satsuma-prod.com/.../settlement-chain-testnet-staging/api`

### Promoting to Testnet (Production Testnet)

1. **Verify Testnet-Staging**
   - Ensure schema works correctly with testnet-staging contracts
   - Verify funding-portal integration works on testnet-staging
   - Get stakeholder approval

2. **Update Contract Addresses** (if needed)

   If testnet contract addresses differ from testnet-staging, update:
   - `app-chain/testnet.yaml`
   - `settlement-chain/testnet.yaml`

3. **Create Promotion PR**

   ```bash
   git checkout testnet
   git pull origin testnet
   git checkout -b promote/testnet-staging-to-testnet
   git merge origin/testnet-staging

   # If contract addresses need updating, do it now
   # Then commit the changes

   git push origin promote/testnet-staging-to-testnet
   ```

4. **Review and Merge**
   - Create PR from promotion branch to `testnet`
   - Review changes since last testnet deployment
   - Merge to `testnet` branch

5. **Deploy to Testnet**

   ```bash
   git checkout testnet
   git pull origin testnet

   # Bump version in .env files
   # app-chain/.env - update VERSION_LABEL (e.g., v0.2.6)
   # settlement-chain/.env - update VERSION_LABEL (e.g., v0.2.6)

   # Deploy app-chain
   cd app-chain
   yarn build:testnet
   yarn deploy:testnet

   # Deploy settlement-chain
   cd ../settlement-chain
   yarn build:testnet
   yarn deploy:testnet
   ```

   The subgraphs will be available at:
   - `https://subgraph.satsuma-prod.com/.../app-chain-testnet/api`
   - `https://subgraph.satsuma-prod.com/.../settlement-chain-testnet/api`

6. **Update Frontend Environment Variables**

   The `funding-portal/testnet` branch should already be configured to use these endpoints via Vercel environment variables.

### Promoting to Mainnet (Production)

1. **Verify Testnet Production**
   - Ensure testnet subgraphs are stable and syncing correctly
   - Verify all queries work as expected
   - Get final approval from stakeholders

2. **Update Mainnet Configuration**

   Update contract addresses and network settings:
   - `app-chain/mainnet.yaml` - mainnet contract addresses
   - `settlement-chain/mainnet.yaml` - mainnet contract addresses

3. **Create Mainnet Promotion PR**

   ```bash
   git checkout mainnet
   git pull origin mainnet
   git checkout -b promote/testnet-to-mainnet
   git merge origin/testnet

   # Update mainnet.yaml files with correct addresses
   # Commit changes

   git push origin promote/testnet-to-mainnet
   ```

4. **Final Review**
   - Thoroughly review all changes
   - Ensure mainnet contract addresses are correct
   - Get security/audit approval if needed
   - Merge to `mainnet` branch

5. **Deploy to Mainnet**

   ```bash
   git checkout mainnet
   git pull origin mainnet

   # Bump version for mainnet deployment
   # Update VERSION_LABEL in both .env files

   # Deploy app-chain
   cd app-chain
   yarn build:mainnet
   yarn deploy:mainnet

   # Deploy settlement-chain
   cd ../settlement-chain
   yarn build:mainnet
   yarn deploy:mainnet
   ```

6. **Monitor Deployment**
   - Watch subgraph sync progress in Alchemy dashboard
   - Verify data is indexing correctly
   - Monitor for any errors or issues

## Version Management

### Version Labels

Update `VERSION_LABEL` in `.env` files before each deployment:

```bash
# app-chain/.env
DEPLOY_KEY=your-deploy-key
VERSION_LABEL=v0.2.6

# settlement-chain/.env
DEPLOY_KEY=your-deploy-key
VERSION_LABEL=v0.2.6
```

### Version Strategy

- **Patch versions** (v0.2.5 → v0.2.6): Bug fixes, minor mapping changes
- **Minor versions** (v0.2.6 → v0.3.0): New entities, new fields, schema additions
- **Major versions** (v0.3.0 → v1.0.0): Breaking changes, complete rewrites

Always increment version when deploying to the same environment to avoid "version already exists" errors.

## Subgraph Endpoints

### Testnet-Staging

- **App Chain**: `https://subgraph.satsuma-prod.com/a046fea75687/ephemerahq/app-chain-testnet-staging/api`
- **Settlement Chain**: `https://subgraph.satsuma-prod.com/a046fea75687/ephemerahq/settlement-chain-testnet-staging/api`

### Testnet (Production Testnet)

- **App Chain**: `https://subgraph.satsuma-prod.com/a046fea75687/ephemerahq/app-chain-testnet/api`
- **Settlement Chain**: `https://subgraph.satsuma-prod.com/a046fea75687/ephemerahq/settlement-chain-testnet/api`

### Mainnet (Production)

- **App Chain**: `https://subgraph.satsuma-prod.com/a046fea75687/ephemerahq/app-chain-mainnet/api`
- **Settlement Chain**: `https://subgraph.satsuma-prod.com/a046fea75687/ephemerahq/settlement-chain-mainnet/api`

**Note**: Always use stable endpoints (without `/version/xxx`) for frontend integration.

## Common Commands Reference

### Per Subproject (app-chain or settlement-chain)

```bash
# Install dependencies
yarn install

# Code generation
yarn codegen:testnet-staging
yarn codegen:testnet
yarn codegen:mainnet

# Build
yarn build:testnet-staging
yarn build:testnet
yarn build:mainnet

# Deploy
yarn deploy:testnet-staging
yarn deploy:testnet
yarn deploy:mainnet

# Test
yarn test

# Format
yarn prettier
```

## Schema Changes

When making schema changes:

1. **Update schema.graphql** in the relevant subproject
2. **Update mappings** to handle new entities/fields
3. **Generate code**: `yarn codegen:testnet-staging`
4. **Test locally** if possible
5. **Deploy to testnet-staging** first
6. **Verify queries** work in GraphQL playground
7. **Update frontend** to use new schema (coordinate with frontend team)
8. **Promote to testnet** after testing
9. **Finally promote to mainnet** after testnet verification

## Coordination with Other Repos

### Smart Contracts

When smart contracts are updated:

1. Wait for new contracts to be deployed to environment
2. Update subgraph YAML files with new contract addresses
3. Update ABIs if contract interfaces changed
4. Deploy subgraph to corresponding environment

### Funding Portal

The funding portal depends on subgraph APIs:

1. Deploy subgraphs first
2. Ensure new schema is backward compatible if possible
3. Coordinate breaking changes with frontend team
4. Frontend can deploy after subgraphs are synced

## Hotfix Process

For critical subgraph issues:

1. **Create Hotfix Branch**

   ```bash
   # From the affected production branch
   git checkout testnet  # or mainnet
   git pull origin testnet
   git checkout -b hotfix/critical-issue
   ```

2. **Fix and Test**
   - Make minimal changes to fix the issue
   - Test with affected environment's contracts

3. **Deploy Hotfix**

   ```bash
   # Bump version
   # Update VERSION_LABEL in .env

   # Deploy to affected environment
   cd app-chain  # or settlement-chain
   yarn build:testnet
   yarn deploy:testnet
   ```

4. **Backport to Development**
   ```bash
   # Merge hotfix back to testnet-staging
   git checkout testnet-staging
   git merge hotfix/critical-issue
   git push origin testnet-staging
   ```

## Troubleshooting

### Subgraph Not Syncing

- Check contract addresses in YAML files
- Verify network name matches deployed contracts
- Check start blocks are correct
- Monitor Alchemy dashboard for errors

### Deployment Fails: "Version Already Exists"

- Increment `VERSION_LABEL` in `.env` file
- Ensure you're deploying a new version

### Schema Validation Errors

- Run `yarn codegen:testnet-staging` to catch errors early
- Check entity relationships are valid
- Ensure all required fields are defined

### Query Errors in Frontend

- Verify subgraph has finished syncing
- Check GraphQL playground for query syntax
- Ensure frontend uses correct endpoint URL

## Best Practices

1. **Always deploy to testnet-staging first** for testing
2. **Increment versions** for each deployment to same environment
3. **Test queries** in GraphQL playground after deployment
4. **Coordinate with frontend team** on schema changes
5. **Monitor sync progress** after deployment
6. **Use stable endpoints** (without version) in frontend
7. **Document breaking changes** in PR descriptions
8. **Keep branches in sync** with regular merges from upstream

## Migration Notes

### Transitioning from `main` Branch

The `main` branch is **deprecated**:

1. Retarget open PRs to `testnet-staging`
2. Update CI/CD references to `main`
3. Update documentation
4. Delete `main` branch once migrated

### Updating Local Repositories

```bash
# Update remote branches
git fetch --all

# Switch to new default branch
git checkout testnet-staging
git branch --set-upstream-to=origin/testnet-staging

# Clean up old main branch (optional)
git branch -d main
```

## Questions or Issues?

If you have questions about this git flow or encounter issues:

- Check this document first
- Review the corresponding smart-contracts and funding-portal GITFLOW.md
- Ask in the team channel
- Reach out to the devops/platform team
