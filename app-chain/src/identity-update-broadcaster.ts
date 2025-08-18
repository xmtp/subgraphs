import { Address, BigInt, Timestamp } from '@graphprotocol/graph-ts';
import { ethereum } from '@graphprotocol/graph-ts/chain/ethereum';

import {
    Account,
    IdentityUpdate,
    IdentityUpdateBroadcaster,
    IdentityUpdateBroadcasterMaxPayloadSizeSnapshot,
    IdentityUpdateBroadcasterMinPayloadSizeSnapshot,
    IdentityUpdateBroadcasterPausedSnapshot,
    IdentityUpdateBroadcasterPayloadBootstrapperSnapshot,
    IdentityUpdateBroadcasterTotalIdentityUpdateBytesCreatedSnapshot,
    IdentityUpdateBroadcasterTotalIdentityUpdatesCreatedSnapshot,
    IdentityUpdateBroadcasterTotalIdentityUpdateTransactionFeesSnapshot,
    IdentityUpdateBytesCreatedSnapshot,
    IdentityUpdatesCreatedSnapshot,
    IdentityUpdateTransactionFeesSnapshot,
} from '../generated/schema';

import {
    IdentityUpdateCreated as IdentityUpdateCreatedEvent,
    MinPayloadSizeUpdated as MinPayloadSizeUpdatedEvent,
    MaxPayloadSizeUpdated as MaxPayloadSizeUpdatedEvent,
    PauseStatusUpdated as PauseStatusUpdatedEvent,
    PayloadBootstrapperUpdated as PayloadBootstrapperUpdatedEvent,
} from '../generated/IdentityUpdateBroadcaster/IdentityUpdateBroadcaster';

import { ZERO_ADDRESS, getAccount, updateAccountTransactionFeesSnapshot } from './common';

/* ============ Handlers ============ */

export function handleIdentityUpdateCreated(event: IdentityUpdateCreatedEvent): void {
    const broadcaster = getIdentityUpdateBroadcaster(event.address);
    const account = getAccount(event.transaction.from);
    const updateLength = event.params.update.length;
    const timestamp = event.block.timestamp.toI32();
    const gasUsed = event.receipt === null ? BigInt.fromI32(0) : (event.receipt as ethereum.TransactionReceipt).gasUsed;
    const gasPrice = event.transaction.gasPrice;
    const transactionFee = gasUsed.times(gasPrice);
    const transactionHash = event.transaction.hash.toHexString();

    account.identityUpdatesCreated = account.identityUpdatesCreated.plus(BigInt.fromI32(1));
    updateAccountIdentityUpdatesCreatedSnapshot(account, timestamp, account.identityUpdatesCreated);

    account.identityUpdateBytesCreated = account.identityUpdateBytesCreated.plus(BigInt.fromI32(updateLength));
    updateAccountIdentityUpdateBytesCreatedSnapshot(account, timestamp, account.identityUpdateBytesCreated);

    account.identityUpdateTransactionFees = account.identityUpdateTransactionFees.plus(transactionFee);
    updateAccountIdentityUpdateTransactionFeesSnapshot(account, timestamp, account.identityUpdateTransactionFees);

    account.identityUpdateTransactionFees = account.identityUpdateTransactionFees.plus(transactionFee);
    updateAccountTransactionFeesSnapshot(account, timestamp, account.identityUpdateTransactionFees);

    account.lastUpdate = timestamp;
    account.save();

    broadcaster.totalIdentityUpdatesCreated = broadcaster.totalIdentityUpdatesCreated.plus(BigInt.fromI32(1));

    updateIdentityUpdateBroadcasterTotalIdentityUpdatesCreatedSnapshot(
        timestamp,
        broadcaster.totalIdentityUpdatesCreated
    );

    broadcaster.totalIdentityUpdateBytesCreated = broadcaster.totalIdentityUpdateBytesCreated.plus(
        BigInt.fromI32(updateLength)
    );

    updateIdentityUpdateBroadcasterTotalIdentityUpdateBytesCreatedSnapshot(
        timestamp,
        broadcaster.totalIdentityUpdateBytesCreated
    );

    broadcaster.totalIdentityUpdateTransactionFees =
        broadcaster.totalIdentityUpdateTransactionFees.plus(transactionFee);

    updateIdentityUpdateBroadcasterTotalIdentityUpdateTransactionFeesSnapshot(
        timestamp,
        broadcaster.totalIdentityUpdateTransactionFees
    );

    broadcaster.lastUpdate = timestamp;
    broadcaster.save();

    const identityUpdate = new IdentityUpdate(`identityUpdate-${transactionHash}`);

    identityUpdate.account = account.id;
    identityUpdate.inboxId = event.params.inboxId.toHexString();
    identityUpdate.sequenceId = event.params.sequenceId;
    identityUpdate.identityUpdateSize = updateLength;
    identityUpdate.timestamp = timestamp;
    identityUpdate.transactionHash = transactionHash;
    identityUpdate.logIndex = event.logIndex;
    identityUpdate.transactionFee = transactionFee;

    identityUpdate.save();
}

export function handleMinPayloadSizeUpdated(event: MinPayloadSizeUpdatedEvent): void {
    const broadcaster = getIdentityUpdateBroadcaster(event.address);
    const timestamp = event.block.timestamp.toI32();

    broadcaster.minPayloadSize = event.params.size;
    updateIdentityUpdateBroadcasterMinPayloadSizeSnapshot(timestamp, broadcaster.minPayloadSize);

    broadcaster.lastUpdate = timestamp;
    broadcaster.save();
}

export function handleMaxPayloadSizeUpdated(event: MaxPayloadSizeUpdatedEvent): void {
    const broadcaster = getIdentityUpdateBroadcaster(event.address);
    const timestamp = event.block.timestamp.toI32();

    broadcaster.maxPayloadSize = event.params.size;
    updateIdentityUpdateBroadcasterMaxPayloadSizeSnapshot(timestamp, broadcaster.maxPayloadSize);

    broadcaster.lastUpdate = timestamp;
    broadcaster.save();
}

export function handlePauseStatusUpdated(event: PauseStatusUpdatedEvent): void {
    const broadcaster = getIdentityUpdateBroadcaster(event.address);
    const timestamp = event.block.timestamp.toI32();

    broadcaster.paused = event.params.paused;
    updateIdentityUpdateBroadcasterPausedSnapshot(timestamp, broadcaster.paused);

    broadcaster.lastUpdate = timestamp;
    broadcaster.save();
}

export function handlePayloadBootstrapperUpdated(event: PayloadBootstrapperUpdatedEvent): void {
    const broadcaster = getIdentityUpdateBroadcaster(event.address);
    const timestamp = event.block.timestamp.toI32();

    broadcaster.payloadBootstrapper = event.params.payloadBootstrapper.toHexString();
    updateIdentityUpdateBroadcasterPayloadBootstrapperSnapshot(timestamp, broadcaster.payloadBootstrapper);

    broadcaster.lastUpdate = timestamp;
    broadcaster.save();
}

/* ============ Entity Helpers ============ */

export function getIdentityUpdateBroadcaster(identityUpdateBroadcasterAddress: Address): IdentityUpdateBroadcaster {
    const id = `identityUpdateBroadcaster-${identityUpdateBroadcasterAddress.toHexString()}`;

    let broadcaster = IdentityUpdateBroadcaster.load(id);

    if (broadcaster) return broadcaster;

    broadcaster = new IdentityUpdateBroadcaster(id);

    broadcaster.lastUpdate = 0;
    broadcaster.minPayloadSize = BigInt.fromI32(0);
    broadcaster.maxPayloadSize = BigInt.fromI32(0);
    broadcaster.paused = false;
    broadcaster.payloadBootstrapper = ZERO_ADDRESS.toHexString();
    broadcaster.totalIdentityUpdatesCreated = BigInt.fromI32(0);
    broadcaster.totalIdentityUpdateBytesCreated = BigInt.fromI32(0);
    broadcaster.totalIdentityUpdateTransactionFees = BigInt.fromI32(0);

    return broadcaster;
}

/* ============ Identity Update Broadcaster Snapshot Helpers ============ */

function updateIdentityUpdateBroadcasterMinPayloadSizeSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `identityUpdateBroadcasterMinPayloadSize-${timestamp.toString()}`;

    let snapshot = IdentityUpdateBroadcasterMinPayloadSizeSnapshot.load(id);

    if (!snapshot) {
        snapshot = new IdentityUpdateBroadcasterMinPayloadSizeSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateIdentityUpdateBroadcasterMaxPayloadSizeSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `identityUpdateBroadcasterMaxPayloadSize-${timestamp.toString()}`;

    let snapshot = IdentityUpdateBroadcasterMaxPayloadSizeSnapshot.load(id);

    if (!snapshot) {
        snapshot = new IdentityUpdateBroadcasterMaxPayloadSizeSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateIdentityUpdateBroadcasterPausedSnapshot(timestamp: Timestamp, value: boolean): void {
    const id = `identityUpdateBroadcasterPaused-${timestamp.toString()}`;

    let snapshot = IdentityUpdateBroadcasterPausedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new IdentityUpdateBroadcasterPausedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateIdentityUpdateBroadcasterPayloadBootstrapperSnapshot(timestamp: Timestamp, value: string): void {
    const id = `identityUpdateBroadcasterPayloadBootstrapper-${timestamp.toString()}`;

    let snapshot = IdentityUpdateBroadcasterPayloadBootstrapperSnapshot.load(id);

    if (!snapshot) {
        snapshot = new IdentityUpdateBroadcasterPayloadBootstrapperSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateIdentityUpdateBroadcasterTotalIdentityUpdatesCreatedSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `identityUpdateBroadcasterTotalIdentityUpdatesCreated-${timestamp.toString()}`;

    let snapshot = IdentityUpdateBroadcasterTotalIdentityUpdatesCreatedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new IdentityUpdateBroadcasterTotalIdentityUpdatesCreatedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateIdentityUpdateBroadcasterTotalIdentityUpdateBytesCreatedSnapshot(
    timestamp: Timestamp,
    value: BigInt
): void {
    const id = `identityUpdateBroadcasterTotalIdentityUpdateBytesCreated-${timestamp.toString()}`;

    let snapshot = IdentityUpdateBroadcasterTotalIdentityUpdateBytesCreatedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new IdentityUpdateBroadcasterTotalIdentityUpdateBytesCreatedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateIdentityUpdateBroadcasterTotalIdentityUpdateTransactionFeesSnapshot(
    timestamp: Timestamp,
    value: BigInt
): void {
    const id = `identityUpdateBroadcasterTotalIdentityUpdateTransactionFees-${timestamp.toString()}`;

    let snapshot = IdentityUpdateBroadcasterTotalIdentityUpdateTransactionFeesSnapshot.load(id);

    if (!snapshot) {
        snapshot = new IdentityUpdateBroadcasterTotalIdentityUpdateTransactionFeesSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

/* ============ Account Snapshot Helpers ============ */

function updateAccountIdentityUpdatesCreatedSnapshot(account: Account, timestamp: Timestamp, value: BigInt): void {
    const id = `accountIdentityUpdatesCreated-${account.address}-${timestamp.toString()}`;

    let snapshot = IdentityUpdatesCreatedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new IdentityUpdatesCreatedSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateAccountIdentityUpdateBytesCreatedSnapshot(account: Account, timestamp: Timestamp, value: BigInt): void {
    const id = `accountIdentityUpdateBytesCreated-${account.address}-${timestamp.toString()}`;

    let snapshot = IdentityUpdateBytesCreatedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new IdentityUpdateBytesCreatedSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateAccountIdentityUpdateTransactionFeesSnapshot(
    account: Account,
    timestamp: Timestamp,
    value: BigInt
): void {
    const id = `accountIdentityUpdateTransactionFees-${account.address}-${timestamp.toString()}`;

    let snapshot = IdentityUpdateTransactionFeesSnapshot.load(id);

    if (!snapshot) {
        snapshot = new IdentityUpdateTransactionFeesSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}
