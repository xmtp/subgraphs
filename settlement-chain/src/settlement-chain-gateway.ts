import { Address, BigInt, dataSource } from '@graphprotocol/graph-ts';

import {
    Account,
    GatewayDeposit,
    GatewayImplementationSnapshot,
    GatewayInbox,
    GatewayInboxAddressSnapshot,
    GatewayPausedSnapshot,
    GatewayReceivedWithdrawal,
    GatewayTotalDepositedSnapshot,
    GatewayTotalWithdrawalsReceivedSnapshot,
    GatewayWithdrawalsReceivedSnapshot,
    History,
    ParameterSend,
    SettlementChainGateway,
} from '../generated/schema';

import {
    Deposit as DepositEvent,
    InboxUpdated as InboxUpdatedEvent,
    ParametersSent as ParametersSentEvent,
    PauseStatusUpdated as PauseStatusUpdatedEvent,
    WithdrawalReceived as WithdrawalReceivedEvent,
    Upgraded as UpgradedEvent,
} from '../generated/SettlementChainGateway/SettlementChainGateway';

import { getAccount } from './common';
import { getPayer } from './payer-registry';

const STARTING_IMPLEMENTATION = dataSource.context().getString('startingImplementation');

/* ============ Handlers ============ */

export function handleDeposit(event: DepositEvent): void {
    handleSomeDeposit(
        event.address,
        event.transaction.from,
        event.params.amount,
        event.params.chainId,
        event.params.messageNumber,
        event.block.timestamp.toI32(),
        event.transaction.hash.toHexString(),
        event.logIndex
    );
}

function handleSomeDeposit(
    gatewayAddress: Address,
    sender: Address,
    amount: BigInt,
    chainId: BigInt,
    messageNumber: BigInt,
    timestamp: i32,
    transactionHash: string,
    logIndex: BigInt
): void {
    const gateway = getSettlementChainGateway(gatewayAddress);

    gateway.totalDeposited = gateway.totalDeposited.plus(amount);
    updateGatewayTotalDepositedSnapshot(timestamp, gateway.totalDeposited);

    gateway.lastUpdate = timestamp;
    gateway.save();

    const deposit = new GatewayDeposit(`SettlementChainGatewayDeposit-${transactionHash}-${logIndex.toString()}`);

    deposit.recipient = '';  // Recipient is encoded in the cross-chain message
    deposit.amount = amount;
    deposit.chainId = chainId;
    deposit.messageNumber = messageNumber;
    deposit.timestamp = timestamp;
    deposit.transactionHash = transactionHash;
    deposit.logIndex = logIndex;

    deposit.save();

    // Create History entry for the bridge deposit
    const payer = getPayer(sender);
    const historyId = `History-${transactionHash}-${logIndex.toString()}`;
    const history = new History(historyId);

    history.eventType = "BRIDGE_DEPOSIT";
    history.payer = payer.id;
    history.amount = amount;
    history.timestamp = timestamp;
    history.transactionHash = transactionHash;
    history.logIndex = logIndex;
    history.withdrawableTimestamp = null;
    history.relatedWithdrawal = null;
    history.recipient = null;  // Recipient is not available in the event, it's encoded in the message

    history.save();
}

export function handleParametersSent(event: ParametersSentEvent): void {
    const gateway = getSettlementChainGateway(event.address);
    const timestamp = event.block.timestamp.toI32();

    gateway.lastUpdate = timestamp;
    gateway.save();

    const parameterSend = new ParameterSend(`ParameterSend-${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`);

    parameterSend.keys = event.params.keys;
    parameterSend.chainId = event.params.chainId;
    parameterSend.messageNumber = event.params.messageNumber;
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

export function handleUpgraded(event: UpgradedEvent): void {
    const gateway = getSettlementChainGateway(event.address);
    const timestamp = event.block.timestamp.toI32();

    gateway.implementation = event.params.implementation.toHexString();
    updateGatewayImplementationSnapshot(timestamp, gateway.implementation);

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
    gateway.implementation = STARTING_IMPLEMENTATION;
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

function updateGatewayTotalDepositedSnapshot(timestamp: i32, value: BigInt): void {
    const id = `SettlementChainGatewayTotalDepositedSnapshot-${timestamp.toString()}`;

    let snapshot = GatewayTotalDepositedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GatewayTotalDepositedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateGatewayTotalWithdrawalsReceivedSnapshot(timestamp: i32, value: BigInt): void {
    const id = `SettlementChainGatewayTotalWithdrawalsReceivedSnapshot-${timestamp.toString()}`;

    let snapshot = GatewayTotalWithdrawalsReceivedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GatewayTotalWithdrawalsReceivedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateGatewayPausedSnapshot(timestamp: i32, value: boolean): void {
    const id = `SettlementChainGatewayPausedSnapshot-${timestamp.toString()}`;

    let snapshot = GatewayPausedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GatewayPausedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateGatewayImplementationSnapshot(timestamp: i32, value: string): void {
    const id = `SettlementChainGatewayImplementationSnapshot-${timestamp.toString()}`;

    let snapshot = GatewayImplementationSnapshot.load(id);

    if (!snapshot) {
        snapshot = new GatewayImplementationSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

/* ============ Account Snapshot Helpers ============ */

function updateAccountGatewayWithdrawalsReceivedSnapshot(account: Account, timestamp: i32, value: BigInt): void {
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

function updateGatewayInboxAddressSnapshot(inbox: GatewayInbox, timestamp: i32, value: string): void {
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
