import { Address, BigInt, Timestamp } from '@graphprotocol/graph-ts';
import { ethereum } from '@graphprotocol/graph-ts/chain/ethereum';

import {
    Account,
    GroupMessage,
    GroupMessageBroadcaster,
    MaxGroupMessagePayloadSizeSnapshot,
    MinGroupMessagePayloadSizeSnapshot,
    GroupMessageBroadcasterPausedSnapshot,
    GroupMessagePayloadBootstrapperSnapshot,
    TotalGroupMessageBytesSentSnapshot,
    TotalGroupMessagesSentSnapshot,
    TotalGroupMessageFeesSnapshot,
    GroupMessageBytesSentSnapshot,
    GroupMessagesSentSnapshot,
    GroupMessageFeesSnapshot,
} from '../generated/schema';

import {
    MessageSent as MessageSentEvent,
    MinPayloadSizeUpdated as MinPayloadSizeUpdatedEvent,
    MaxPayloadSizeUpdated as MaxPayloadSizeUpdatedEvent,
    PauseStatusUpdated as PauseStatusUpdatedEvent,
    PayloadBootstrapperUpdated as PayloadBootstrapperUpdatedEvent,
} from '../generated/GroupMessageBroadcaster/GroupMessageBroadcaster';

import { ZERO_ADDRESS, getAccount, updateAccountFeesSnapshot } from './common';

/* ============ Handlers ============ */

export function handleMessageSent(event: MessageSentEvent): void {
    const broadcaster = getGroupMessageBroadcaster(event.address);
    const account = getAccount(event.transaction.from);
    const messageLength = event.params.message.length;
    const timestamp = event.block.timestamp.toI32();
    const gasUsed = event.receipt === null ? BigInt.fromI32(0) : (event.receipt as ethereum.TransactionReceipt).gasUsed;
    const gasPrice = event.transaction.gasPrice;
    const transactionFee = gasUsed.times(gasPrice);
    const transactionHash = event.transaction.hash.toHexString();

    account.groupMessagesSent = account.groupMessagesSent.plus(BigInt.fromI32(1));
    updateAccountGroupMessagesSentSnapshot(account, timestamp, account.groupMessagesSent);

    account.groupMessageBytesSent = account.groupMessageBytesSent.plus(BigInt.fromI32(messageLength));
    updateAccountGroupMessageBytesSentSnapshot(account, timestamp, account.groupMessageBytesSent);

    account.groupMessageFees = account.groupMessageFees.plus(transactionFee);
    updateAccountGroupMessageFeesSnapshot(account, timestamp, account.groupMessageFees);

    account.fees = account.fees.plus(transactionFee);
    updateAccountFeesSnapshot(account, timestamp, account.fees);

    account.lastUpdate = timestamp;
    account.save();

    broadcaster.totalGroupMessagesSent = broadcaster.totalGroupMessagesSent.plus(BigInt.fromI32(1));
    updateTotalGroupMessagesSentSnapshot(timestamp, broadcaster.totalGroupMessagesSent);

    broadcaster.totalGroupMessageBytesSent = broadcaster.totalGroupMessageBytesSent.plus(BigInt.fromI32(messageLength));
    updateTotalGroupMessageBytesSentSnapshot(timestamp, broadcaster.totalGroupMessageBytesSent);

    broadcaster.totalGroupMessageFees = broadcaster.totalGroupMessageFees.plus(transactionFee);
    updateTotalGroupMessageFeesSnapshot(timestamp, broadcaster.totalGroupMessageFees);

    broadcaster.lastUpdate = timestamp;
    broadcaster.save();

    const groupMessage = new GroupMessage(`GroupMessage-${transactionHash}`);

    groupMessage.account = account.id;
    groupMessage.groupId = event.params.groupId.toHexString();
    groupMessage.sequenceId = event.params.sequenceId;
    groupMessage.messageSize = messageLength;
    groupMessage.timestamp = timestamp;
    groupMessage.transactionHash = transactionHash;
    groupMessage.logIndex = event.logIndex;
    groupMessage.fee = transactionFee;

    groupMessage.save();
}

export function handleMinPayloadSizeUpdated(event: MinPayloadSizeUpdatedEvent): void {
    const broadcaster = getGroupMessageBroadcaster(event.address);
    const timestamp = event.block.timestamp.toI32();

    broadcaster.minPayloadSize = event.params.size;
    updateMinGroupMessagePayloadSizeSnapshot(timestamp, broadcaster.minPayloadSize);

    broadcaster.lastUpdate = timestamp;
    broadcaster.save();
}

export function handleMaxPayloadSizeUpdated(event: MaxPayloadSizeUpdatedEvent): void {
    const broadcaster = getGroupMessageBroadcaster(event.address);
    const timestamp = event.block.timestamp.toI32();

    broadcaster.maxPayloadSize = event.params.size;
    updateMaxGroupMessagePayloadSizeSnapshot(timestamp, broadcaster.maxPayloadSize);

    broadcaster.lastUpdate = timestamp;
    broadcaster.save();
}

export function handlePauseStatusUpdated(event: PauseStatusUpdatedEvent): void {
    const broadcaster = getGroupMessageBroadcaster(event.address);
    const timestamp = event.block.timestamp.toI32();

    broadcaster.paused = event.params.paused;
    updateGroupMessageBroadcasterPausedSnapshot(timestamp, broadcaster.paused);

    broadcaster.lastUpdate = timestamp;
    broadcaster.save();
}

export function handlePayloadBootstrapperUpdated(event: PayloadBootstrapperUpdatedEvent): void {
    const broadcaster = getGroupMessageBroadcaster(event.address);
    const timestamp = event.block.timestamp.toI32();

    broadcaster.payloadBootstrapper = event.params.payloadBootstrapper.toHexString();
    updateGroupMessagePayloadBootstrapperSnapshot(timestamp, broadcaster.payloadBootstrapper);

    broadcaster.lastUpdate = timestamp;
    broadcaster.save();
}

/* ============ Entity Helpers ============ */

export function getGroupMessageBroadcaster(groupMessageBroadcasterAddress: Address): GroupMessageBroadcaster {
    const id = `GroupMessageBroadcaster-${groupMessageBroadcasterAddress.toHexString()}`;

    let broadcaster = GroupMessageBroadcaster.load(id);

    if (broadcaster) return broadcaster;

    broadcaster = new GroupMessageBroadcaster(id);

    broadcaster.lastUpdate = 0;
    broadcaster.minPayloadSize = BigInt.fromI32(0);
    broadcaster.maxPayloadSize = BigInt.fromI32(0);
    broadcaster.paused = false;
    broadcaster.payloadBootstrapper = ZERO_ADDRESS.toHexString();
    broadcaster.totalGroupMessagesSent = BigInt.fromI32(0);
    broadcaster.totalGroupMessageBytesSent = BigInt.fromI32(0);
    broadcaster.totalGroupMessageFees = BigInt.fromI32(0);

    return broadcaster;
}

/* ============ Group Message Broadcaster Snapshot Helpers ============ */

function updateMinGroupMessagePayloadSizeSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `MinGroupMessagePayloadSizeSnapshot-${timestamp.toString()}`;

    let snapshot = MinGroupMessagePayloadSizeSnapshot.load(id);

    if (!snapshot) {
        snapshot = new MinGroupMessagePayloadSizeSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateMaxGroupMessagePayloadSizeSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `MaxGroupMessagePayloadSizeSnapshot-${timestamp.toString()}`;

    let snapshot = MaxGroupMessagePayloadSizeSnapshot.load(id);

    if (!snapshot) {
        snapshot = new MaxGroupMessagePayloadSizeSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateGroupMessageBroadcasterPausedSnapshot(timestamp: Timestamp, value: boolean): void {
    const id = `GroupMessageBroadcasterPausedSnapshot-${timestamp.toString()}`;

    let snapshot = GroupMessageBroadcasterPausedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GroupMessageBroadcasterPausedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateGroupMessagePayloadBootstrapperSnapshot(timestamp: Timestamp, value: string): void {
    const id = `GroupMessagePayloadBootstrapperSnapshot-${timestamp.toString()}`;

    let snapshot = GroupMessagePayloadBootstrapperSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GroupMessagePayloadBootstrapperSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateTotalGroupMessagesSentSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `TotalGroupMessagesSentSnapshot-${timestamp.toString()}`;

    let snapshot = TotalGroupMessagesSentSnapshot.load(id);

    if (!snapshot) {
        snapshot = new TotalGroupMessagesSentSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateTotalGroupMessageBytesSentSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `TotalGroupMessageBytesSentSnapshot-${timestamp.toString()}`;

    let snapshot = TotalGroupMessageBytesSentSnapshot.load(id);

    if (!snapshot) {
        snapshot = new TotalGroupMessageBytesSentSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateTotalGroupMessageFeesSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `TotalGroupMessageFeesSnapshot-${timestamp.toString()}`;

    let snapshot = TotalGroupMessageFeesSnapshot.load(id);

    if (!snapshot) {
        snapshot = new TotalGroupMessageFeesSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

/* ============ Account Snapshot Helpers ============ */

function updateAccountGroupMessagesSentSnapshot(account: Account, timestamp: Timestamp, value: BigInt): void {
    const id = `GroupMessagesSentSnapshot-${account.address}-${timestamp.toString()}`;

    let snapshot = GroupMessagesSentSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GroupMessagesSentSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateAccountGroupMessageBytesSentSnapshot(account: Account, timestamp: Timestamp, value: BigInt): void {
    const id = `GroupMessageBytesSentSnapshot-${account.address}-${timestamp.toString()}`;

    let snapshot = GroupMessageBytesSentSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GroupMessageBytesSentSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateAccountGroupMessageFeesSnapshot(account: Account, timestamp: Timestamp, value: BigInt): void {
    const id = `GroupMessageFeesSnapshot-${account.address}-${timestamp.toString()}`;

    let snapshot = GroupMessageFeesSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GroupMessageFeesSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}
