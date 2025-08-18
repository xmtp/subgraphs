import { Address, BigInt, Timestamp } from '@graphprotocol/graph-ts';
import { ethereum } from '@graphprotocol/graph-ts/chain/ethereum';

import {
    Account,
    AppChainGateway,
    AppChainGatewayPausedSnapshot,
    TotalDepositsReceivedSnapshot,
    TotalWithdrawnSnapshot,
    ReceivedDeposit,
    DepositsReceivedSnapshot,
    ParameterReceival,
    ReceivedParameter,
    Withdrawal,
    WithdrawnSnapshot,
} from '../generated/schema';

import {
    DepositReceived as DepositReceivedEvent,
    ParametersReceived as ParametersReceivedEvent,
    PauseStatusUpdated as PauseStatusUpdatedEvent,
    Withdrawal as WithdrawalEvent,
} from '../generated/AppChainGateway/AppChainGateway';

import { getAccount } from './common';

/* ============ Handlers ============ */

export function handleDepositReceived(event: DepositReceivedEvent): void {
    const gateway = getAppChainGateway(event.address);
    const account = getAccount(event.params.recipient);
    const timestamp = event.block.timestamp.toI32();
    const gasUsed = event.receipt === null ? BigInt.fromI32(0) : (event.receipt as ethereum.TransactionReceipt).gasUsed;
    const gasPrice = event.transaction.gasPrice;
    const transactionFee = gasUsed.times(gasPrice);
    const transactionHash = event.transaction.hash.toHexString();
    const amount = event.params.amount;

    account.depositsReceived = account.depositsReceived.plus(amount);
    updateAccountDepositsReceivedSnapshot(account, timestamp, account.depositsReceived);

    account.lastUpdate = timestamp;
    account.save();

    gateway.totalDepositsReceived = gateway.totalDepositsReceived.plus(amount);
    updateTotalDepositsReceivedSnapshot(timestamp, gateway.totalDepositsReceived);

    gateway.lastUpdate = timestamp;
    gateway.save();

    const deposit = new ReceivedDeposit(`ReceivedDeposit-${transactionHash}`);

    deposit.recipient = account.id;
    deposit.amount = amount;
    deposit.timestamp = timestamp;
    deposit.transactionHash = transactionHash;
    deposit.logIndex = event.logIndex;
    deposit.fee = transactionFee;

    deposit.save();
}

export function handleParametersReceived(event: ParametersReceivedEvent): void {
    const gateway = getAppChainGateway(event.address);
    const timestamp = event.block.timestamp.toI32();
    const transactionHash = event.transaction.hash.toHexString();

    gateway.lastUpdate = timestamp;
    gateway.save();

    const parameterReceival = new ParameterReceival(`ParameterReceival-${transactionHash}`);

    for (let i = 0; i < event.params.keys.length; i++) {
        const key = event.params.keys[i];
        const parameter = new ReceivedParameter(`ReceivedParameter-${transactionHash}-${i}`);

        parameter.key = key;
        parameter.event = parameterReceival.id;

        parameter.save();
    }

    parameterReceival.timestamp = timestamp;
    parameterReceival.transactionHash = event.transaction.hash.toHexString();
    parameterReceival.logIndex = event.logIndex;

    parameterReceival.save();
}

export function handlePauseStatusUpdated(event: PauseStatusUpdatedEvent): void {
    const gateway = getAppChainGateway(event.address);
    const timestamp = event.block.timestamp.toI32();

    gateway.paused = event.params.paused;
    updateAppChainGatewayPausedSnapshot(timestamp, gateway.paused);

    gateway.lastUpdate = timestamp;
    gateway.save();
}

export function handleWithdrawal(event: WithdrawalEvent): void {
    const gateway = getAppChainGateway(event.address);
    const account = getAccount(event.params.account);
    const timestamp = event.block.timestamp.toI32();
    const gasUsed = event.receipt === null ? BigInt.fromI32(0) : (event.receipt as ethereum.TransactionReceipt).gasUsed;
    const gasPrice = event.transaction.gasPrice;
    const transactionFee = gasUsed.times(gasPrice);
    const transactionHash = event.transaction.hash.toHexString();
    const amount = event.params.amount;

    account.withdrawn = account.withdrawn.plus(amount);
    updateAccountWithdrawnSnapshot(account, timestamp, account.withdrawn);

    account.lastUpdate = timestamp;
    account.save();

    gateway.totalWithdrawn = gateway.totalWithdrawn.plus(amount);
    updateTotalWithdrawnSnapshot(timestamp, gateway.totalWithdrawn);

    gateway.lastUpdate = timestamp;
    gateway.save();

    const withdrawal = new Withdrawal(`Withdrawal-${transactionHash}`);

    withdrawal.account = account.id;
    withdrawal.recipient = event.params.recipient.toHexString();
    withdrawal.amount = amount;
    withdrawal.timestamp = timestamp;
    withdrawal.transactionHash = transactionHash;
    withdrawal.logIndex = event.logIndex;
    withdrawal.fee = transactionFee;

    withdrawal.save();
}

/* ============ Entity Helpers ============ */

function getAppChainGateway(address: Address): AppChainGateway {
    const id = `AppChainGateway-${address.toHexString()}`;

    let gateway = AppChainGateway.load(id);

    if (gateway) return gateway;

    gateway = new AppChainGateway(id);

    gateway.lastUpdate = 0;
    gateway.paused = false;
    gateway.totalWithdrawn = BigInt.fromI32(0);
    gateway.totalDepositsReceived = BigInt.fromI32(0);

    return gateway;
}

/* ============ AppChainGateway Snapshot Helpers ============ */

function updateTotalDepositsReceivedSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `TotalDepositsReceivedSnapshot-${timestamp.toString()}`;

    let snapshot = TotalDepositsReceivedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new TotalDepositsReceivedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateAppChainGatewayPausedSnapshot(timestamp: Timestamp, value: boolean): void {
    const id = `AppChainGatewayPausedSnapshot-${timestamp.toString()}`;

    let snapshot = AppChainGatewayPausedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new AppChainGatewayPausedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateTotalWithdrawnSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `TotalWithdrawnSnapshot-${timestamp.toString()}`;

    let snapshot = TotalWithdrawnSnapshot.load(id);

    if (!snapshot) {
        snapshot = new TotalWithdrawnSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

/* ============ Account Snapshot Helpers ============ */

function updateAccountDepositsReceivedSnapshot(account: Account, timestamp: Timestamp, value: BigInt): void {
    const id = `DepositsReceivedSnapshot-${account.address}-${timestamp.toString()}`;

    let snapshot = DepositsReceivedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new DepositsReceivedSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateAccountWithdrawnSnapshot(account: Account, timestamp: Timestamp, value: BigInt): void {
    const id = `WithdrawnSnapshot-${account.address}-${timestamp.toString()}`;

    let snapshot = WithdrawnSnapshot.load(id);

    if (!snapshot) {
        snapshot = new WithdrawnSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}
