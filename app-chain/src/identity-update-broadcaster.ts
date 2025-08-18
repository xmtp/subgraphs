import { Address, BigInt, Timestamp } from '@graphprotocol/graph-ts';
import { ethereum } from '@graphprotocol/graph-ts/chain/ethereum';

import {
    Account,
    IdentityUpdate,
    IdentityUpdateBroadcaster,
    MaxIdentityUpdatePayloadSizeSnapshot,
    MinIdentityUpdatePayloadSizeSnapshot,
    IdentityUpdateBroadcasterPausedSnapshot,
    IdentityUpdatePayloadBootstrapperSnapshot,
    TotalIdentityUpdateBytesCreatedSnapshot,
    TotalIdentityUpdatesCreatedSnapshot,
    TotalIdentityUpdateFeesSnapshot,
    IdentityUpdateBytesCreatedSnapshot,
    IdentityUpdatesCreatedSnapshot,
    IdentityUpdateFeesSnapshot,
} from '../generated/schema';

import {
    IdentityUpdateCreated as IdentityUpdateCreatedEvent,
    MinPayloadSizeUpdated as MinPayloadSizeUpdatedEvent,
    MaxPayloadSizeUpdated as MaxPayloadSizeUpdatedEvent,
    PauseStatusUpdated as PauseStatusUpdatedEvent,
    PayloadBootstrapperUpdated as PayloadBootstrapperUpdatedEvent,
} from '../generated/IdentityUpdateBroadcaster/IdentityUpdateBroadcaster';

import { ZERO_ADDRESS, getAccount, updateAccountFeesSnapshot } from './common';

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

    account.identityUpdateFees = account.identityUpdateFees.plus(transactionFee);
    updateAccountIdentityUpdateFeesSnapshot(account, timestamp, account.identityUpdateFees);

    account.fees = account.fees.plus(transactionFee);
    updateAccountFeesSnapshot(account, timestamp, account.fees);

    account.lastUpdate = timestamp;
    account.save();

    broadcaster.totalIdentityUpdatesCreated = broadcaster.totalIdentityUpdatesCreated.plus(BigInt.fromI32(1));
    updateTotalIdentityUpdatesCreatedSnapshot(timestamp, broadcaster.totalIdentityUpdatesCreated);

    broadcaster.totalIdentityUpdateBytesCreated = broadcaster.totalIdentityUpdateBytesCreated.plus(
        BigInt.fromI32(updateLength)
    );

    updateTotalIdentityUpdateBytesCreatedSnapshot(timestamp, broadcaster.totalIdentityUpdateBytesCreated);

    broadcaster.totalIdentityUpdateFees = broadcaster.totalIdentityUpdateFees.plus(transactionFee);
    updateTotalIdentityUpdateFeesSnapshot(timestamp, broadcaster.totalIdentityUpdateFees);

    broadcaster.lastUpdate = timestamp;
    broadcaster.save();

    const identityUpdate = new IdentityUpdate(`IdentityUpdate-${transactionHash}`);

    identityUpdate.account = account.id;
    identityUpdate.inboxId = event.params.inboxId.toHexString();
    identityUpdate.sequenceId = event.params.sequenceId;
    identityUpdate.identityUpdateSize = updateLength;
    identityUpdate.timestamp = timestamp;
    identityUpdate.transactionHash = transactionHash;
    identityUpdate.logIndex = event.logIndex;
    identityUpdate.fee = transactionFee;

    identityUpdate.save();
}

export function handleMinPayloadSizeUpdated(event: MinPayloadSizeUpdatedEvent): void {
    const broadcaster = getIdentityUpdateBroadcaster(event.address);
    const timestamp = event.block.timestamp.toI32();

    broadcaster.minPayloadSize = event.params.size;
    updateMinIdentityUpdatePayloadSizeSnapshot(timestamp, broadcaster.minPayloadSize);

    broadcaster.lastUpdate = timestamp;
    broadcaster.save();
}

export function handleMaxPayloadSizeUpdated(event: MaxPayloadSizeUpdatedEvent): void {
    const broadcaster = getIdentityUpdateBroadcaster(event.address);
    const timestamp = event.block.timestamp.toI32();

    broadcaster.maxPayloadSize = event.params.size;
    updateMaxIdentityUpdatePayloadSizeSnapshot(timestamp, broadcaster.maxPayloadSize);

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
    updateIdentityUpdatePayloadBootstrapperSnapshot(timestamp, broadcaster.payloadBootstrapper);

    broadcaster.lastUpdate = timestamp;
    broadcaster.save();
}

/* ============ Entity Helpers ============ */

export function getIdentityUpdateBroadcaster(identityUpdateBroadcasterAddress: Address): IdentityUpdateBroadcaster {
    const id = `IdentityUpdateBroadcaster-${identityUpdateBroadcasterAddress.toHexString()}`;

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
    broadcaster.totalIdentityUpdateFees = BigInt.fromI32(0);

    return broadcaster;
}

/* ============ Identity Update Broadcaster Snapshot Helpers ============ */

function updateMinIdentityUpdatePayloadSizeSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `MinIdentityUpdatePayloadSizeSnapshot-${timestamp.toString()}`;

    let snapshot = MinIdentityUpdatePayloadSizeSnapshot.load(id);

    if (!snapshot) {
        snapshot = new MinIdentityUpdatePayloadSizeSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateMaxIdentityUpdatePayloadSizeSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `MaxIdentityUpdatePayloadSizeSnapshot-${timestamp.toString()}`;

    let snapshot = MaxIdentityUpdatePayloadSizeSnapshot.load(id);

    if (!snapshot) {
        snapshot = new MaxIdentityUpdatePayloadSizeSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateIdentityUpdateBroadcasterPausedSnapshot(timestamp: Timestamp, value: boolean): void {
    const id = `IdentityUpdateBroadcasterPausedSnapshot-${timestamp.toString()}`;

    let snapshot = IdentityUpdateBroadcasterPausedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new IdentityUpdateBroadcasterPausedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateIdentityUpdatePayloadBootstrapperSnapshot(timestamp: Timestamp, value: string): void {
    const id = `IdentityUpdatePayloadBootstrapperSnapshot-${timestamp.toString()}`;

    let snapshot = IdentityUpdatePayloadBootstrapperSnapshot.load(id);

    if (!snapshot) {
        snapshot = new IdentityUpdatePayloadBootstrapperSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateTotalIdentityUpdatesCreatedSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `TotalIdentityUpdatesCreatedSnapshot-${timestamp.toString()}`;

    let snapshot = TotalIdentityUpdatesCreatedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new TotalIdentityUpdatesCreatedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateTotalIdentityUpdateBytesCreatedSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `TotalIdentityUpdateBytesCreatedSnapshot-${timestamp.toString()}`;

    let snapshot = TotalIdentityUpdateBytesCreatedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new TotalIdentityUpdateBytesCreatedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateTotalIdentityUpdateFeesSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `TotalIdentityUpdateFeesSnapshot-${timestamp.toString()}`;

    let snapshot = TotalIdentityUpdateFeesSnapshot.load(id);

    if (!snapshot) {
        snapshot = new TotalIdentityUpdateFeesSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

/* ============ Account Snapshot Helpers ============ */

function updateAccountIdentityUpdatesCreatedSnapshot(account: Account, timestamp: Timestamp, value: BigInt): void {
    const id = `IdentityUpdatesCreatedSnapshot-${account.address}-${timestamp.toString()}`;

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
    const id = `IdentityUpdateBytesCreatedSnapshot-${account.address}-${timestamp.toString()}`;

    let snapshot = IdentityUpdateBytesCreatedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new IdentityUpdateBytesCreatedSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateAccountIdentityUpdateFeesSnapshot(account: Account, timestamp: Timestamp, value: BigInt): void {
    const id = `IdentityUpdateFeesSnapshot-${account.address}-${timestamp.toString()}`;

    let snapshot = IdentityUpdateFeesSnapshot.load(id);

    if (!snapshot) {
        snapshot = new IdentityUpdateFeesSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}
