import { Address, BigInt, Timestamp } from '@graphprotocol/graph-ts';

import {
    Account,
    GatewayDeposit,
    GatewayInbox,
    GatewayInboxAddressSnapshot,
    GatewayPausedSnapshot,
    GatewayReceivedWithdrawal,
    GatewayTotalDepositedSnapshot,
    GatewayTotalWithdrawalsReceivedSnapshot,
    GatewayWithdrawalsReceivedSnapshot,
    ParameterSend,
    SettlementChainGateway,
} from '../generated/schema';

import {
    Deposit as DepositEvent,
    InboxUpdated as InboxUpdatedEvent,
    ParametersSent as ParametersSentEvent,
    PauseStatusUpdated as PauseStatusUpdatedEvent,
    WithdrawalReceived as WithdrawalReceivedEvent,
} from '../generated/SettlementChainGateway/SettlementChainGateway';

import { getAccount } from './common';

/* ============ Handlers ============ */

export function handleDeposit(event: DepositEvent): void {
    const gateway = getSettlementChainGateway(event.address);
    const timestamp = event.block.timestamp.toI32();
    const transactionHash = event.transaction.hash.toHexString();
    const logIndex = event.logIndex;

    gateway.totalDeposited = gateway.totalDeposited.plus(event.params.amount);
    updateGatewayTotalDepositedSnapshot(timestamp, gateway.totalDeposited);

    gateway.lastUpdate = timestamp;
    gateway.save();

    const deposit = new GatewayDeposit(`SettlementChainGatewayDeposit-${transactionHash}-${logIndex.toString()}`);

    deposit.recipient = ''; // TODO: event.params.recipient.toHexString()
    deposit.amount = event.params.amount;
    deposit.chainId = event.params.chainId;
    deposit.messageNumber = event.params.messageNumber;
    deposit.timestamp = timestamp;
    deposit.transactionHash = transactionHash;
    deposit.logIndex = logIndex;

    deposit.save();
}

export function handleParametersSent(event: ParametersSentEvent): void {
    const gateway = getSettlementChainGateway(event.address);
    const timestamp = event.block.timestamp.toI32();

    gateway.lastUpdate = timestamp;
    gateway.save();

    const parameterSend = new ParameterSend(
        `ParameterSend-${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`
    );

    parameterSend.keys = event.params.keys;
    parameterSend.timestamp = timestamp;
    parameterSend.transactionHash = event.transaction.hash.toHexString();
    parameterSend.logIndex = event.logIndex;

    parameterSend.save();
}

export function handleInboxUpdated(event: InboxUpdatedEvent): void {
    const gateway = getSettlementChainGateway(event.address);
    const inbox = getGatewayInbox(event.params.chainId);
    const timestamp = event.block.timestamp.toI32();

    gateway.lastUpdate = timestamp;
    gateway.save();

    inbox.address = event.params.inbox.toHexString();
    updateGatewayInboxAddressSnapshot(inbox, timestamp, inbox.address);

    inbox.lastUpdate = timestamp;
    inbox.save();
}

export function handleWithdrawalReceived(event: WithdrawalReceivedEvent): void {
    const gateway = getSettlementChainGateway(event.address);
    const account = getAccount(event.params.recipient);
    const timestamp = event.block.timestamp.toI32();
    const transactionHash = event.transaction.hash.toHexString();
    const logIndex = event.logIndex;

    gateway.totalWithdrawalsReceived = gateway.totalWithdrawalsReceived.plus(event.params.amount);
    updateGatewayTotalWithdrawalsReceivedSnapshot(timestamp, gateway.totalWithdrawalsReceived);

    gateway.lastUpdate = timestamp;
    gateway.save();

    account.gatewayWithdrawalsReceived = account.gatewayWithdrawalsReceived.plus(event.params.amount);
    updateAccountGatewayWithdrawalsReceivedSnapshot(account, timestamp, account.gatewayWithdrawalsReceived);

    const withdrawalId = `GatewayReceivedWithdrawal-${transactionHash}-${logIndex.toString()}`;
    const withdrawal = new GatewayReceivedWithdrawal(withdrawalId);

    withdrawal.recipient = account.id;
    withdrawal.amount = event.params.amount;
    withdrawal.timestamp = timestamp;
    withdrawal.transactionHash = transactionHash;
    withdrawal.logIndex = logIndex;

    withdrawal.save();
}

export function handlePauseStatusUpdated(event: PauseStatusUpdatedEvent): void {
    const gateway = getSettlementChainGateway(event.address);
    const timestamp = event.block.timestamp.toI32();

    gateway.paused = event.params.paused;
    updateGatewayPausedSnapshot(timestamp, gateway.paused);

    gateway.lastUpdate = timestamp;
    gateway.save();
}

/* ============ Entity Helpers ============ */

function getSettlementChainGateway(address: Address): SettlementChainGateway {
    const id = `SettlementChainGateway-${address.toHexString()}`;

    let gateway = SettlementChainGateway.load(id);

    if (gateway) return gateway;

    gateway = new SettlementChainGateway(id);

    gateway.lastUpdate = 0;
    gateway.address = address.toHexString();
    gateway.paused = false;
    gateway.totalWithdrawalsReceived = BigInt.fromI32(0);
    gateway.totalDeposited = BigInt.fromI32(0);

    return gateway;
}

function getGatewayInbox(chainId: BigInt): GatewayInbox {
    const id = `GatewayInbox-${chainId.toString()}`;

    let inbox = GatewayInbox.load(id);

    if (inbox) return inbox;

    inbox = new GatewayInbox(id);

    inbox.lastUpdate = 0;
    inbox.chainId = chainId;
    inbox.address = '';

    return inbox;
}

/* ============ AppChainGateway Snapshot Helpers ============ */

function updateGatewayTotalDepositedSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `SettlementChainGatewayTotalDepositedSnapshot-${timestamp.toString()}`;

    let snapshot = GatewayTotalDepositedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GatewayTotalDepositedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateGatewayTotalWithdrawalsReceivedSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `SettlementChainGatewayTotalWithdrawalsReceivedSnapshot-${timestamp.toString()}`;

    let snapshot = GatewayTotalWithdrawalsReceivedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GatewayTotalWithdrawalsReceivedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateGatewayPausedSnapshot(timestamp: Timestamp, value: boolean): void {
    const id = `SettlementChainGatewayPausedSnapshot-${timestamp.toString()}`;

    let snapshot = GatewayPausedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GatewayPausedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

/* ============ Account Snapshot Helpers ============ */

function updateAccountGatewayWithdrawalsReceivedSnapshot(account: Account, timestamp: Timestamp, value: BigInt): void {
    const id = `SettlementChainGatewayWithdrawalsReceivedSnapshot-${account.address}-${timestamp.toString()}`;

    let snapshot = GatewayWithdrawalsReceivedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GatewayWithdrawalsReceivedSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

/* ============ Inbox Snapshot Helpers ============ */

function updateGatewayInboxAddressSnapshot(inbox: GatewayInbox, timestamp: Timestamp, value: string): void {
    const id = `GatewayInboxAddressSnapshot-${inbox.id}-${timestamp.toString()}`;

    let snapshot = GatewayInboxAddressSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GatewayInboxAddressSnapshot(id);

        snapshot.inbox = inbox.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}
