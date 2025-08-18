import { Address, BigInt, Timestamp } from '@graphprotocol/graph-ts';
import { ethereum } from '@graphprotocol/graph-ts/chain/ethereum';

import {
    Account,
    GroupMessage,
    GroupMessageBroadcaster,
    GroupMessageBroadcasterMaxPayloadSizeSnapshot,
    GroupMessageBroadcasterMinPayloadSizeSnapshot,
    GroupMessageBroadcasterPausedSnapshot,
    GroupMessageBroadcasterPayloadBootstrapperSnapshot,
    GroupMessageBroadcasterTotalMessageBytesSentSnapshot,
    GroupMessageBroadcasterTotalMessagesSentSnapshot,
    GroupMessageBroadcasterTotalMessageTransactionFeesSnapshot,
    GroupMessageBytesSentSnapshot,
    GroupMessagesSentSnapshot,
    GroupMessageTransactionFeesSnapshot,
} from '../generated/schema';

import {
    MessageSent as MessageSentEvent,
    MinPayloadSizeUpdated as MinPayloadSizeUpdatedEvent,
    MaxPayloadSizeUpdated as MaxPayloadSizeUpdatedEvent,
    PauseStatusUpdated as PauseStatusUpdatedEvent,
    PayloadBootstrapperUpdated as PayloadBootstrapperUpdatedEvent,
} from '../generated/GroupMessageBroadcaster/GroupMessageBroadcaster';

import { ZERO_ADDRESS, getAccount, updateAccountTransactionFeesSnapshot } from './common';

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

    account.groupMessageTransactionFees = account.groupMessageTransactionFees.plus(transactionFee);
    updateAccountGroupMessageTransactionFeesSnapshot(account, timestamp, account.groupMessageTransactionFees);

    account.transactionFees = account.transactionFees.plus(transactionFee);
    updateAccountTransactionFeesSnapshot(account, timestamp, account.transactionFees);

    account.lastUpdate = timestamp;
    account.save();

    broadcaster.totalMessagesSent = broadcaster.totalMessagesSent.plus(BigInt.fromI32(1));

    updateGroupMessageBroadcasterTotalMessagesSentSnapshot(timestamp, broadcaster.totalMessagesSent);

    broadcaster.totalMessageBytesSent = broadcaster.totalMessageBytesSent.plus(BigInt.fromI32(messageLength));

    updateGroupMessageBroadcasterTotalMessageBytesSentSnapshot(timestamp, broadcaster.totalMessageBytesSent);

    broadcaster.totalMessageTransactionFees = broadcaster.totalMessageTransactionFees.plus(transactionFee);

    updateGroupMessageBroadcasterTotalMessageTransactionFeesSnapshot(
        timestamp,
        broadcaster.totalMessageTransactionFees
    );

    broadcaster.lastUpdate = timestamp;
    broadcaster.save();

    const groupMessage = new GroupMessage(`groupMessage-${transactionHash}`);

    groupMessage.account = account.id;
    groupMessage.groupId = event.params.groupId.toHexString();
    groupMessage.sequenceId = event.params.sequenceId;
    groupMessage.messageSize = messageLength;
    groupMessage.timestamp = timestamp;
    groupMessage.transactionHash = transactionHash;
    groupMessage.logIndex = event.logIndex;
    groupMessage.transactionFee = transactionFee;

    groupMessage.save();
}

export function handleMinPayloadSizeUpdated(event: MinPayloadSizeUpdatedEvent): void {
    const broadcaster = getGroupMessageBroadcaster(event.address);
    const timestamp = event.block.timestamp.toI32();

    broadcaster.minPayloadSize = event.params.size;
    updateGroupMessageBroadcasterMinPayloadSizeSnapshot(timestamp, broadcaster.minPayloadSize);

    broadcaster.lastUpdate = timestamp;
    broadcaster.save();
}

export function handleMaxPayloadSizeUpdated(event: MaxPayloadSizeUpdatedEvent): void {
    const broadcaster = getGroupMessageBroadcaster(event.address);
    const timestamp = event.block.timestamp.toI32();

    broadcaster.maxPayloadSize = event.params.size;
    updateGroupMessageBroadcasterMaxPayloadSizeSnapshot(timestamp, broadcaster.maxPayloadSize);

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
    updateGroupMessageBroadcasterPayloadBootstrapperSnapshot(timestamp, broadcaster.payloadBootstrapper);

    broadcaster.lastUpdate = timestamp;
    broadcaster.save();
}

/* ============ Entity Helpers ============ */

export function getGroupMessageBroadcaster(groupMessageBroadcasterAddress: Address): GroupMessageBroadcaster {
    const id = `groupMessageBroadcaster-${groupMessageBroadcasterAddress.toHexString()}`;

    let broadcaster = GroupMessageBroadcaster.load(id);

    if (broadcaster) return broadcaster;

    broadcaster = new GroupMessageBroadcaster(id);

    broadcaster.lastUpdate = 0;
    broadcaster.minPayloadSize = BigInt.fromI32(0);
    broadcaster.maxPayloadSize = BigInt.fromI32(0);
    broadcaster.paused = false;
    broadcaster.payloadBootstrapper = ZERO_ADDRESS.toHexString();
    broadcaster.totalMessagesSent = BigInt.fromI32(0);
    broadcaster.totalMessageBytesSent = BigInt.fromI32(0);
    broadcaster.totalMessageTransactionFees = BigInt.fromI32(0);

    return broadcaster;
}

/* ============ Group Message Broadcaster Snapshot Helpers ============ */

function updateGroupMessageBroadcasterMinPayloadSizeSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `groupMessageBroadcasterMinPayloadSize-${timestamp.toString()}`;

    let snapshot = GroupMessageBroadcasterMinPayloadSizeSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GroupMessageBroadcasterMinPayloadSizeSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateGroupMessageBroadcasterMaxPayloadSizeSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `groupMessageBroadcasterMaxPayloadSize-${timestamp.toString()}`;

    let snapshot = GroupMessageBroadcasterMaxPayloadSizeSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GroupMessageBroadcasterMaxPayloadSizeSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateGroupMessageBroadcasterPausedSnapshot(timestamp: Timestamp, value: boolean): void {
    const id = `groupMessageBroadcasterPaused-${timestamp.toString()}`;

    let snapshot = GroupMessageBroadcasterPausedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GroupMessageBroadcasterPausedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateGroupMessageBroadcasterPayloadBootstrapperSnapshot(timestamp: Timestamp, value: string): void {
    const id = `groupMessageBroadcasterPayloadBootstrapper-${timestamp.toString()}`;

    let snapshot = GroupMessageBroadcasterPayloadBootstrapperSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GroupMessageBroadcasterPayloadBootstrapperSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateGroupMessageBroadcasterTotalMessagesSentSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `groupMessageBroadcasterTotalMessagesSent-${timestamp.toString()}`;

    let snapshot = GroupMessageBroadcasterTotalMessagesSentSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GroupMessageBroadcasterTotalMessagesSentSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateGroupMessageBroadcasterTotalMessageBytesSentSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `groupMessageBroadcasterTotalMessageBytesSent-${timestamp.toString()}`;

    let snapshot = GroupMessageBroadcasterTotalMessageBytesSentSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GroupMessageBroadcasterTotalMessageBytesSentSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateGroupMessageBroadcasterTotalMessageTransactionFeesSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `groupMessageBroadcasterTotalMessageTransactionFees-${timestamp.toString()}`;

    let snapshot = GroupMessageBroadcasterTotalMessageTransactionFeesSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GroupMessageBroadcasterTotalMessageTransactionFeesSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

/* ============ Account Snapshot Helpers ============ */

function updateAccountGroupMessagesSentSnapshot(account: Account, timestamp: Timestamp, value: BigInt): void {
    const id = `accountGroupMessagesSent-${account.address}-${timestamp.toString()}`;

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
    const id = `accountGroupMessageBytesSent-${account.address}-${timestamp.toString()}`;

    let snapshot = GroupMessageBytesSentSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GroupMessageBytesSentSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateAccountGroupMessageTransactionFeesSnapshot(account: Account, timestamp: Timestamp, value: BigInt): void {
    const id = `accountGroupMessageTransactionFees-${account.address}-${timestamp.toString()}`;

    let snapshot = GroupMessageTransactionFeesSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GroupMessageTransactionFeesSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}
