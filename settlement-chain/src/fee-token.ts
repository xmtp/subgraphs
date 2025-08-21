import { Address, BigInt, dataSource } from '@graphprotocol/graph-ts';

import {
    Account,
    FeeToken,
    FeeTokenBalanceSnapshot,
    FeeTokenBurnedSnapshot,
    FeeTokenHoldersSnapshot,
    FeeTokenImplementationSnapshot,
    FeeTokenMintedSnapshot,
    FeeTokenReceivedSnapshot,
    FeeTokenSentSnapshot,
    FeeTokenTotalBurnedSnapshot,
    FeeTokenTotalMintedSnapshot,
    FeeTokenTotalSupplySnapshot,
    FeeTokenTotalTransferredSnapshot,
    FeeTokenTransfer,
} from '../generated/schema';

import { Transfer as TransferEvent, Upgraded as UpgradedEvent } from '../generated/FeeToken/FeeToken';

import { getAccount, getPayerRegistry, _updatePayerRegistryExcess } from './common';

const PAYER_REGISTRY_ADDRESS = Address.fromString(dataSource.context().getString('payerRegistry'));
const STARTING_IMPLEMENTATION = dataSource.context().getString('startingImplementation');
const ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000');

/* ============ Handlers ============ */

export function handleTransfer(event: TransferEvent): void {
    const feeToken = getFeeToken(event.address);
    const sender = getAccount(event.params.from);
    const recipient = getAccount(event.params.to);
    const timestamp = event.block.timestamp.toI32();
    const amount = event.params.value;
    const transactionHash = event.transaction.hash.toHexString();

    if (event.params.from.equals(ZERO_ADDRESS)) {
        _mint(feeToken, recipient, amount, timestamp);
    } else if (event.params.to.equals(ZERO_ADDRESS)) {
        _burn(feeToken, sender, amount, timestamp);
    } else {
        _transfer(feeToken, sender, recipient, amount, timestamp);
    }

    feeToken.lastUpdate = timestamp;
    feeToken.save();

    sender.lastUpdate = timestamp;
    sender.save();

    recipient.lastUpdate = timestamp;
    recipient.save();

    if (event.params.from.equals(PAYER_REGISTRY_ADDRESS) || event.params.to.equals(PAYER_REGISTRY_ADDRESS)) {
        _updatePayerRegistryExcess(getPayerRegistry(PAYER_REGISTRY_ADDRESS), timestamp);
    }

    const transfer = new FeeTokenTransfer(`FeeTokenTransfer-${transactionHash}-${event.logIndex.toI32().toString()}`);

    transfer.sender = sender.id;
    transfer.recipient = recipient.id;
    transfer.amount = amount;
    transfer.timestamp = timestamp;
    transfer.logIndex = event.logIndex;
    transfer.transactionHash = transactionHash;

    transfer.save();
}

export function handleUpgraded(event: UpgradedEvent): void {
    const feeToken = getFeeToken(event.address);
    const timestamp = event.block.timestamp.toI32();

    feeToken.implementation = event.params.implementation.toHexString();
    updateImplementationSnapshot(timestamp, feeToken.implementation);

    feeToken.lastUpdate = timestamp;
    feeToken.save();
}

/* ============ Entity Helpers ============ */

function getFeeToken(address: Address): FeeToken {
    const id = `FeeToken-${address.toHexString()}`;

    let feeToken = FeeToken.load(id);

    if (feeToken) return feeToken;

    feeToken = new FeeToken(id);

    feeToken.lastUpdate = 0;
    feeToken.address = address.toHexString();
    feeToken.implementation = STARTING_IMPLEMENTATION;
    feeToken.totalSupply = BigInt.fromI32(0);
    feeToken.holders = 0;
    feeToken.totalTransferred = BigInt.fromI32(0);
    feeToken.totalMinted = BigInt.fromI32(0);
    feeToken.totalBurned = BigInt.fromI32(0);

    return feeToken;
}

/* ============ Fee Token Snapshot Helpers ============ */

function updateTotalSupplySnapshot(timestamp: i32, value: BigInt): void {
    const id = `FeeTokenTotalSupplySnapshot-${timestamp.toString()}`;

    let snapshot = FeeTokenTotalSupplySnapshot.load(id);

    if (!snapshot) {
        snapshot = new FeeTokenTotalSupplySnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateTotalMintedSnapshot(timestamp: i32, value: BigInt): void {
    const id = `FeeTokenTotalMintedSnapshot-${timestamp.toString()}`;

    let snapshot = FeeTokenTotalMintedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new FeeTokenTotalMintedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateTotalBurnedSnapshot(timestamp: i32, value: BigInt): void {
    const id = `FeeTokenTotalBurnedSnapshot-${timestamp.toString()}`;

    let snapshot = FeeTokenTotalBurnedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new FeeTokenTotalBurnedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateTotalTransferredSnapshot(timestamp: i32, value: BigInt): void {
    const id = `FeeTokenTotalTransferredSnapshot-${timestamp.toString()}`;

    let snapshot = FeeTokenTotalTransferredSnapshot.load(id);

    if (!snapshot) {
        snapshot = new FeeTokenTotalTransferredSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateHoldersSnapshot(timestamp: i32, value: i32): void {
    const id = `FeeTokenHoldersSnapshot-${timestamp.toString()}`;

    let snapshot = FeeTokenHoldersSnapshot.load(id);

    if (!snapshot) {
        snapshot = new FeeTokenHoldersSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateImplementationSnapshot(timestamp: i32, value: string): void {
    const id = `FeeTokenImplementationSnapshot-${timestamp.toString()}`;

    let snapshot = FeeTokenImplementationSnapshot.load(id);

    if (!snapshot) {
        snapshot = new FeeTokenImplementationSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

/* ============ Account Snapshot Helpers ============ */

function updateBalanceSnapshot(account: Account, timestamp: i32, value: BigInt): void {
    const id = `FeeTokenBalanceSnapshot-${account.address}-${timestamp.toString()}`;

    let snapshot = FeeTokenBalanceSnapshot.load(id);

    if (!snapshot) {
        snapshot = new FeeTokenBalanceSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateReceivedSnapshot(account: Account, timestamp: i32, value: BigInt): void {
    const id = `FeeTokenReceivedSnapshot-${account.address}-${timestamp.toString()}`;

    let snapshot = FeeTokenReceivedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new FeeTokenReceivedSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateSentSnapshot(account: Account, timestamp: i32, value: BigInt): void {
    const id = `FeeTokenSentSnapshot-${account.address}-${timestamp.toString()}`;

    let snapshot = FeeTokenSentSnapshot.load(id);

    if (!snapshot) {
        snapshot = new FeeTokenSentSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateMintedSnapshot(account: Account, timestamp: i32, value: BigInt): void {
    const id = `FeeTokenMintedSnapshot-${account.address}-${timestamp.toString()}`;

    let snapshot = FeeTokenMintedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new FeeTokenMintedSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateBurnedSnapshot(account: Account, timestamp: i32, value: BigInt): void {
    const id = `FeeTokenBurnedSnapshot-${account.address}-${timestamp.toString()}`;

    let snapshot = FeeTokenBurnedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new FeeTokenBurnedSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

/* ============ Contract Stateful Tracking ============ */

function _burn(feeToken: FeeToken, account: Account, amount: BigInt, timestamp: i32): void {
    if (amount.equals(BigInt.fromI32(0))) return;

    account.feeTokenBalance = account.feeTokenBalance.minus(amount);
    updateBalanceSnapshot(account, timestamp, account.feeTokenBalance);

    feeToken.totalSupply = feeToken.totalSupply.minus(amount);
    updateTotalSupplySnapshot(timestamp, feeToken.totalSupply);

    account.feeTokenBurned = account.feeTokenBurned.plus(amount);
    updateBurnedSnapshot(account, timestamp, account.feeTokenBurned);

    feeToken.totalBurned = feeToken.totalBurned.plus(amount);
    updateTotalBurnedSnapshot(timestamp, feeToken.totalBurned);

    if (account.feeTokenBalance.equals(BigInt.fromI32(0))) {
        feeToken.holders -= 1;
        updateHoldersSnapshot(timestamp, feeToken.holders);
    }
}

function _mint(feeToken: FeeToken, recipient: Account, amount: BigInt, timestamp: i32): void {
    if (amount.equals(BigInt.fromI32(0))) return;

    if (recipient.feeTokenBalance.equals(BigInt.fromI32(0))) {
        feeToken.holders += 1;
        updateHoldersSnapshot(timestamp, feeToken.holders);
    }

    recipient.feeTokenBalance = recipient.feeTokenBalance.plus(amount);
    updateBalanceSnapshot(recipient, timestamp, recipient.feeTokenBalance);

    feeToken.totalSupply = feeToken.totalSupply.plus(amount);
    updateTotalSupplySnapshot(timestamp, feeToken.totalSupply);

    recipient.feeTokenMinted = recipient.feeTokenMinted.plus(amount);
    updateMintedSnapshot(recipient, timestamp, recipient.feeTokenMinted);

    feeToken.totalMinted = feeToken.totalMinted.plus(amount);
    updateTotalMintedSnapshot(timestamp, feeToken.totalMinted);
}

function _transfer(feeToken: FeeToken, sender: Account, recipient: Account, amount: BigInt, timestamp: i32): void {
    if (amount.equals(BigInt.fromI32(0))) return;

    if (recipient.feeTokenBalance.equals(BigInt.fromI32(0))) {
        feeToken.holders += 1;
        updateHoldersSnapshot(timestamp, feeToken.holders);
    }

    sender.feeTokenBalance = sender.feeTokenBalance.minus(amount);
    updateBalanceSnapshot(sender, timestamp, sender.feeTokenBalance);

    sender.feeTokenSent = sender.feeTokenSent.plus(amount);
    updateSentSnapshot(sender, timestamp, sender.feeTokenSent);

    recipient.feeTokenBalance = recipient.feeTokenBalance.plus(amount);
    updateBalanceSnapshot(recipient, timestamp, recipient.feeTokenBalance);

    recipient.feeTokenReceived = recipient.feeTokenReceived.plus(amount);
    updateReceivedSnapshot(recipient, timestamp, recipient.feeTokenReceived);

    feeToken.totalTransferred = feeToken.totalTransferred.plus(amount);
    updateTotalTransferredSnapshot(timestamp, feeToken.totalTransferred);

    if (sender.feeTokenBalance.equals(BigInt.fromI32(0))) {
        feeToken.holders -= 1;
        updateHoldersSnapshot(timestamp, feeToken.holders);
    }
}
