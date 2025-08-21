import { Address, BigInt } from '@graphprotocol/graph-ts';

import {
    Payer,
    PayerRegistry,
    PayerRegistryBalanceSnapshot,
    PayerRegistryBatchUsageSettlement,
    PayerRegistryDeposit,
    PayerRegistryDepositedSnapshot,
    PayerRegistryExcessTransfer,
    PayerRegistryFeeDistributorSnapshot,
    PayerRegistryImplementationSnapshot,
    PayerRegistryIncurredDebtSnapshot,
    PayerRegistryMinimumDepositSnapshot,
    PayerRegistryPausedSnapshot,
    PayerRegistryRepaidDebtSnapshot,
    PayerRegistrySettlerSnapshot,
    PayerRegistryTotalBalanceSnapshot,
    PayerRegistryTotalDebtSnapshot,
    PayerRegistryTotalDepositedSnapshot,
    PayerRegistryTotalDepositsSnapshot,
    PayerRegistryTotalExcessTransferredSnapshot,
    PayerRegistryTotalIncurredDebtSnapshot,
    PayerRegistryTotalPendingWithdrawalsSnapshot,
    PayerRegistryTotalRepaidDebtSnapshot,
    PayerRegistryTotalUsageSettledSnapshot,
    PayerRegistryTotalWithdrawnSnapshot,
    PayerRegistryUsageSettledSnapshot,
    PayerRegistryUsageSettlement,
    PayerRegistryWithdrawal,
    PayerRegistryWithdrawLockPeriodSnapshot,
    PayerRegistryWithdrawnSnapshot,
} from '../generated/schema';

import {
    Deposit as DepositEvent,
    ExcessTransferred as ExcessTransferredEvent,
    FeeDistributorUpdated as FeeDistributorUpdatedEvent,
    MinimumDepositUpdated as MinimumDepositUpdatedEvent,
    PauseStatusUpdated as PauseStatusUpdatedEvent,
    SettlerUpdated as SettlerUpdatedEvent,
    UsageSettled as UsageSettledEvent,
    WithdrawalCancelled as WithdrawalCancelledEvent,
    WithdrawalFinalized as WithdrawalFinalizedEvent,
    WithdrawalRequested as WithdrawalRequestedEvent,
    WithdrawLockPeriodUpdated as WithdrawLockPeriodUpdatedEvent,
    Upgraded as UpgradedEvent,
} from '../generated/PayerRegistry/PayerRegistry';

import { getPayerRegistry, _updatePayerRegistryTotalWithdrawable } from './common';

/* ============ Handlers ============ */

export function handleDeposit(event: DepositEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const amount = event.params.amount;
    const timestamp = event.block.timestamp.toI32();
    const payer = getPayer(event.params.payer);

    _deposit(payerRegistry, payer, amount, timestamp);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();

    payer.lastUpdate = timestamp;
    payer.save();

    const depositId = `PayerRegistryDeposit-${event.transaction.hash.toHexString()}-${event.logIndex.toString()}`;
    const deposit = new PayerRegistryDeposit(depositId);

    deposit.payer = payer.id;
    deposit.amount = amount;
    deposit.timestamp = timestamp;
    deposit.transactionHash = event.transaction.hash.toHexString();
    deposit.logIndex = event.logIndex;

    deposit.save();
}

export function handleExcessTransferred(event: ExcessTransferredEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const amount = event.params.amount;
    const timestamp = event.block.timestamp.toI32();
    const transactionHash = event.transaction.hash.toHexString();
    const logIndex = event.logIndex;

    _transferExcess(payerRegistry, amount, timestamp);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();

    const excessTransferId = `PayerRegistryExcessTransfer-${transactionHash}-${logIndex.toString()}`;
    const excessTransfer = new PayerRegistryExcessTransfer(excessTransferId);

    excessTransfer.amount = amount;
    excessTransfer.timestamp = timestamp;
    excessTransfer.transactionHash = transactionHash;
    excessTransfer.logIndex = logIndex;

    excessTransfer.save();
}

export function handleFeeDistributorUpdated(event: FeeDistributorUpdatedEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();

    payerRegistry.feeDistributor = event.params.feeDistributor.toHexString();
    updatePayerRegistryFeeDistributorSnapshot(timestamp, payerRegistry.feeDistributor);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();
}

export function handleMinimumDepositUpdated(event: MinimumDepositUpdatedEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();

    payerRegistry.minimumDeposit = event.params.minimumDeposit;
    updatePayerRegistryMinimumDepositSnapshot(timestamp, payerRegistry.minimumDeposit);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();
}

export function handlePauseStatusUpdated(event: PauseStatusUpdatedEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();

    payerRegistry.paused = event.params.paused;
    updatePayerRegistryPausedSnapshot(timestamp, payerRegistry.paused);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();
}

export function handleSettlerUpdated(event: SettlerUpdatedEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();

    payerRegistry.settler = event.params.settler.toHexString();
    updatePayerRegistrySettlerSnapshot(timestamp, payerRegistry.settler);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();
}

export function handleUsageSettled(event: UsageSettledEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const amount = event.params.amount;
    const timestamp = event.block.timestamp.toI32();
    const payer = getPayer(event.params.payer);
    const transactionHash = event.transaction.hash.toHexString();
    const logIndex = event.logIndex;

    _settleUsage(payerRegistry, payer, amount, timestamp);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();

    payer.lastUpdate = timestamp;
    payer.save();

    const batchUsageSettlement = getPayerRegistryBatchUsageSettlement(transactionHash, timestamp);

    batchUsageSettlement.amount = batchUsageSettlement.amount.plus(amount);

    batchUsageSettlement.save();

    const usageSettlement = new PayerRegistryUsageSettlement(
        `PayerRegistryUsageSettlement-${transactionHash}-${logIndex.toString()}`
    );

    usageSettlement.payer = payer.id;
    usageSettlement.amount = amount;
    usageSettlement.batchUsageSettlement = batchUsageSettlement.id;
    usageSettlement.logIndex = logIndex;

    usageSettlement.save();
}

export function handleWithdrawLockPeriodUpdated(event: WithdrawLockPeriodUpdatedEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();

    payerRegistry.withdrawLockPeriod = event.params.withdrawLockPeriod.toI32();
    updatePayerRegistryWithdrawLockPeriodSnapshot(timestamp, payerRegistry.withdrawLockPeriod);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();
}

export function handleWithdrawalCancelled(event: WithdrawalCancelledEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();
    const payer = getPayer(event.params.payer);
    const transactionHash = event.transaction.hash.toHexString();
    const logIndex = event.logIndex;

    const withdrawalId = payer.pendingWithdrawal ? payer.pendingWithdrawal : '__DNE__';
    const withdrawal = PayerRegistryWithdrawal.load(withdrawalId as string);

    if (!withdrawal) throw new Error('No pending withdrawal');

    _cancelWithdrawal(payerRegistry, payer, withdrawal, timestamp);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();

    payer.pendingWithdrawal = null;
    payer.lastUpdate = timestamp;
    payer.save();

    withdrawal.cancelTimestamp = timestamp;
    withdrawal.cancelTransactionHash = transactionHash;
    withdrawal.cancelLogIndex = logIndex;

    withdrawal.save();
}

export function handleWithdrawalFinalized(event: WithdrawalFinalizedEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();
    const payer = getPayer(event.params.payer);
    const transactionHash = event.transaction.hash.toHexString();
    const logIndex = event.logIndex;

    const withdrawalId = payer.pendingWithdrawal ? payer.pendingWithdrawal : '__DNE__';
    const withdrawal = PayerRegistryWithdrawal.load(withdrawalId as string);

    if (!withdrawal) throw new Error('No pending withdrawal');

    _finalizeWithdrawal(payerRegistry, payer, withdrawal, timestamp);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();

    payer.lastUpdate = timestamp;
    payer.save();

    withdrawal.finalizeTimestamp = timestamp;
    withdrawal.finalizeTransactionHash = transactionHash;
    withdrawal.finalizeLogIndex = logIndex;

    withdrawal.save();
}

export function handleWithdrawalRequested(event: WithdrawalRequestedEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();
    const payer = getPayer(event.params.payer);
    const amount = event.params.amount;
    const withdrawableTimestamp = event.params.withdrawableTimestamp.toI32();
    const transactionHash = event.transaction.hash.toHexString();
    const logIndex = event.logIndex;

    _requestWithdrawal(payerRegistry, payer, amount, timestamp);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();

    const withdrawal = getPayerRegistryWithdrawal(transactionHash, logIndex);

    withdrawal.payer = payer.id;
    withdrawal.amount = amount;
    withdrawal.withdrawableTimestamp = withdrawableTimestamp;
    withdrawal.requestTimestamp = timestamp;
    withdrawal.requestTransactionHash = transactionHash;
    withdrawal.requestLogIndex = logIndex;

    withdrawal.save();

    payer.pendingWithdrawal = withdrawal.id;
    payer.lastUpdate = timestamp;

    payer.save();
}

export function handleUpgraded(event: UpgradedEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();

    payerRegistry.implementation = event.params.implementation.toHexString();
    updatePayerRegistryImplementationSnapshot(timestamp, payerRegistry.implementation);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();
}

/* ============ Entity Helpers ============ */

function getPayer(address: Address): Payer {
    const id = `Payer-${address.toHexString()}`;

    let payer = Payer.load(id);

    if (payer) return payer;

    payer = new Payer(id);

    payer.lastUpdate = 0;
    payer.address = address.toHexString();
    payer.balance = BigInt.fromI32(0);
    payer.pendingWithdrawal = null;
    payer.deposited = BigInt.fromI32(0);
    payer.incurredDebt = BigInt.fromI32(0);
    payer.repaidDebt = BigInt.fromI32(0);
    payer.withdrawn = BigInt.fromI32(0);
    payer.usageSettled = BigInt.fromI32(0);

    return payer;
}

function getPayerRegistryBatchUsageSettlement(
    transactionHash: string,
    timestamp: i32
): PayerRegistryBatchUsageSettlement {
    const id = `PayerRegistryBatchUsageSettlement-${transactionHash}`;

    let batchUsageSettlement = PayerRegistryBatchUsageSettlement.load(id);

    if (batchUsageSettlement) return batchUsageSettlement;

    batchUsageSettlement = new PayerRegistryBatchUsageSettlement(id);

    batchUsageSettlement.amount = BigInt.fromI32(0);
    batchUsageSettlement.timestamp = timestamp;
    batchUsageSettlement.transactionHash = transactionHash;

    return batchUsageSettlement;
}

function getPayerRegistryWithdrawal(transactionHash: string, logIndex: BigInt): PayerRegistryWithdrawal {
    const id = `PayerRegistryWithdrawal-${transactionHash}-${logIndex.toString()}`;

    let withdrawal = PayerRegistryWithdrawal.load(id);

    if (withdrawal) return withdrawal;

    withdrawal = new PayerRegistryWithdrawal(id);

    withdrawal.payer = '';
    withdrawal.amount = BigInt.fromI32(0);
    withdrawal.withdrawableTimestamp = 0;
    withdrawal.requestTimestamp = 0;
    withdrawal.requestTransactionHash = '';
    withdrawal.requestLogIndex = BigInt.fromI32(0);
    withdrawal.cancelTimestamp = 0;
    withdrawal.cancelTransactionHash = '';
    withdrawal.cancelLogIndex = BigInt.fromI32(0);
    withdrawal.finalizeTimestamp = 0;
    withdrawal.finalizeTransactionHash = '';
    withdrawal.finalizeLogIndex = BigInt.fromI32(0);

    return withdrawal;
}

/* ============ Payer Snapshot Helpers ============ */

function updatePayerRegistryBalanceSnapshot(payer: Payer, timestamp: i32, value: BigInt): void {
    const id = `PayerRegistryBalanceSnapshot-${payer.address}-${timestamp.toString()}`;

    let snapshot = PayerRegistryBalanceSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryBalanceSnapshot(id);

        snapshot.payer = payer.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryDepositedSnapshot(payer: Payer, timestamp: i32, value: BigInt): void {
    const id = `PayerRegistryDepositedSnapshot-${payer.address}-${timestamp.toString()}`;

    let snapshot = PayerRegistryDepositedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryDepositedSnapshot(id);

        snapshot.payer = payer.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryIncurredDebtSnapshot(payer: Payer, timestamp: i32, value: BigInt): void {
    const id = `PayerRegistryIncurredDebtSnapshot-${payer.address}-${timestamp.toString()}`;

    let snapshot = PayerRegistryIncurredDebtSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryIncurredDebtSnapshot(id);

        snapshot.payer = payer.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryRepaidDebtSnapshot(payer: Payer, timestamp: i32, value: BigInt): void {
    const id = `PayerRegistryRepaidDebtSnapshot-${payer.address}-${timestamp.toString()}`;

    let snapshot = PayerRegistryRepaidDebtSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryRepaidDebtSnapshot(id);

        snapshot.payer = payer.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryUsageSettledSnapshot(payer: Payer, timestamp: i32, value: BigInt): void {
    const id = `PayerRegistryUsageSettledSnapshot-${payer.address}-${timestamp.toString()}`;

    let snapshot = PayerRegistryUsageSettledSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryUsageSettledSnapshot(id);

        snapshot.payer = payer.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryWithdrawnSnapshot(payer: Payer, timestamp: i32, value: BigInt): void {
    const id = `PayerRegistryWithdrawnSnapshot-${payer.address}-${timestamp.toString()}`;

    let snapshot = PayerRegistryWithdrawnSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryWithdrawnSnapshot(id);

        snapshot.payer = payer.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

/* ============ Payer Registry Snapshot Helpers ============ */

function updatePayerRegistryTotalIncurredDebtSnapshot(timestamp: i32, value: BigInt): void {
    const id = `PayerRegistryTotalIncurredDebtSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalIncurredDebtSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalIncurredDebtSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalRepaidDebtSnapshot(timestamp: i32, value: BigInt): void {
    const id = `PayerRegistryTotalRepaidDebtSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalRepaidDebtSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalRepaidDebtSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalDebtSnapshot(timestamp: i32, value: BigInt): void {
    const id = `PayerRegistryTotalDebtSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalDebtSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalDebtSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalDepositsSnapshot(timestamp: i32, value: BigInt): void {
    const id = `PayerRegistryTotalDepositsSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalDepositsSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalDepositsSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalBalanceSnapshot(timestamp: i32, value: BigInt): void {
    const id = `PayerRegistryTotalBalanceSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalBalanceSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalBalanceSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalDepositedSnapshot(timestamp: i32, value: BigInt): void {
    const id = `PayerRegistryTotalDepositedSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalDepositedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalDepositedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalExcessTransferredSnapshot(timestamp: i32, value: BigInt): void {
    const id = `PayerRegistryTotalExcessTransferredSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalExcessTransferredSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalExcessTransferredSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryFeeDistributorSnapshot(timestamp: i32, value: string): void {
    const id = `PayerRegistryFeeDistributorSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistryFeeDistributorSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryFeeDistributorSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryMinimumDepositSnapshot(timestamp: i32, value: BigInt): void {
    const id = `PayerRegistryMinimumDepositSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistryMinimumDepositSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryMinimumDepositSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryPausedSnapshot(timestamp: i32, value: boolean): void {
    const id = `PayerRegistryPausedSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistryPausedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryPausedSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistrySettlerSnapshot(timestamp: i32, value: string): void {
    const id = `PayerRegistrySettlerSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistrySettlerSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistrySettlerSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalUsageSettledSnapshot(timestamp: i32, value: BigInt): void {
    const id = `PayerRegistryTotalUsageSettledSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalUsageSettledSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalUsageSettledSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryWithdrawLockPeriodSnapshot(timestamp: i32, value: i32): void {
    const id = `PayerRegistryWithdrawLockPeriodSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistryWithdrawLockPeriodSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryWithdrawLockPeriodSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalPendingWithdrawalsSnapshot(timestamp: i32, value: BigInt): void {
    const id = `PayerRegistryTotalPendingWithdrawalsSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalPendingWithdrawalsSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalPendingWithdrawalsSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalWithdrawnSnapshot(timestamp: i32, value: BigInt): void {
    const id = `PayerRegistryTotalWithdrawnSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalWithdrawnSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalWithdrawnSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryImplementationSnapshot(timestamp: i32, value: string): void {
    const id = `PayerRegistryImplementationSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistryImplementationSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryImplementationSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

/* ============ Contract Stateful Tracking ============ */

function _deposit(payerRegistry: PayerRegistry, payer: Payer, amount: BigInt, timestamp: i32): void {
    if (amount.equals(BigInt.fromI32(0))) return;

    const debtRepaid = _increaseBalance(payerRegistry, payer, amount, timestamp);

    payer.repaidDebt = payer.repaidDebt.plus(debtRepaid);
    updatePayerRegistryRepaidDebtSnapshot(payer, timestamp, payer.repaidDebt);

    payerRegistry.totalRepaidDebt = payerRegistry.totalRepaidDebt.plus(debtRepaid);
    updatePayerRegistryTotalRepaidDebtSnapshot(timestamp, payerRegistry.totalRepaidDebt);

    payerRegistry.totalDebt = payerRegistry.totalDebt.minus(debtRepaid);
    updatePayerRegistryTotalDebtSnapshot(timestamp, payerRegistry.totalDebt);

    payerRegistry.totalDeposits = payerRegistry.totalDeposits.plus(amount);
    updatePayerRegistryTotalDepositsSnapshot(timestamp, payerRegistry.totalDeposits);

    payer.deposited = payer.deposited.plus(amount);
    updatePayerRegistryDepositedSnapshot(payer, timestamp, payer.deposited);

    payerRegistry.totalDeposited = payerRegistry.totalDeposited.plus(amount);
    updatePayerRegistryTotalDepositedSnapshot(timestamp, payerRegistry.totalDeposited);

    _updatePayerRegistryTotalWithdrawable(payerRegistry, timestamp);
}

function _transferExcess(payerRegistry: PayerRegistry, amount: BigInt, timestamp: i32): void {
    payerRegistry.totalExcessTransferred = payerRegistry.totalExcessTransferred.plus(amount);
    updatePayerRegistryTotalExcessTransferredSnapshot(timestamp, payerRegistry.totalExcessTransferred);
}

function _settleUsage(payerRegistry: PayerRegistry, payer: Payer, amount: BigInt, timestamp: i32): void {
    const debtIncurred = _decreaseBalance(payerRegistry, payer, amount, timestamp);

    payer.incurredDebt = payer.incurredDebt.plus(debtIncurred);
    updatePayerRegistryIncurredDebtSnapshot(payer, timestamp, payer.incurredDebt);

    payerRegistry.totalIncurredDebt = payerRegistry.totalIncurredDebt.plus(debtIncurred);
    updatePayerRegistryTotalIncurredDebtSnapshot(timestamp, payerRegistry.totalIncurredDebt);

    payerRegistry.totalDeposits = payerRegistry.totalDeposits.minus(amount);
    updatePayerRegistryTotalDepositsSnapshot(timestamp, payerRegistry.totalDeposits);

    payerRegistry.totalDebt = payerRegistry.totalDebt.plus(debtIncurred);
    updatePayerRegistryTotalDebtSnapshot(timestamp, payerRegistry.totalDebt);

    payer.usageSettled = payer.usageSettled.plus(amount);
    updatePayerRegistryUsageSettledSnapshot(payer, timestamp, payer.usageSettled);

    payerRegistry.totalUsageSettled = payerRegistry.totalUsageSettled.plus(amount);
    updatePayerRegistryTotalUsageSettledSnapshot(timestamp, payerRegistry.totalUsageSettled);

    _updatePayerRegistryTotalWithdrawable(payerRegistry, timestamp);
}

function _cancelWithdrawal(
    payerRegistry: PayerRegistry,
    payer: Payer,
    pendingWithdrawal: PayerRegistryWithdrawal,
    timestamp: i32
): void {
    const debtRepaid = _increaseBalance(payerRegistry, payer, pendingWithdrawal.amount, timestamp);

    payer.repaidDebt = payer.repaidDebt.plus(debtRepaid);
    updatePayerRegistryRepaidDebtSnapshot(payer, timestamp, payer.repaidDebt);

    payerRegistry.totalRepaidDebt = payerRegistry.totalRepaidDebt.plus(debtRepaid);
    updatePayerRegistryTotalRepaidDebtSnapshot(timestamp, payerRegistry.totalRepaidDebt);

    payerRegistry.totalDebt = payerRegistry.totalDebt.minus(debtRepaid);
    updatePayerRegistryTotalDebtSnapshot(timestamp, payerRegistry.totalDebt);

    payerRegistry.totalPendingWithdrawals = payerRegistry.totalPendingWithdrawals.minus(pendingWithdrawal.amount);
    updatePayerRegistryTotalPendingWithdrawalsSnapshot(timestamp, payerRegistry.totalPendingWithdrawals);

    _updatePayerRegistryTotalWithdrawable(payerRegistry, timestamp);
}

function _finalizeWithdrawal(
    payerRegistry: PayerRegistry,
    payer: Payer,
    pendingWithdrawal: PayerRegistryWithdrawal,
    timestamp: i32
): void {
    payerRegistry.totalPendingWithdrawals = payerRegistry.totalPendingWithdrawals.minus(pendingWithdrawal.amount);
    updatePayerRegistryTotalPendingWithdrawalsSnapshot(timestamp, payerRegistry.totalPendingWithdrawals);

    payerRegistry.totalDeposits = payerRegistry.totalDeposits.minus(pendingWithdrawal.amount);
    updatePayerRegistryTotalDepositsSnapshot(timestamp, payerRegistry.totalDeposits);

    payer.withdrawn = payer.withdrawn.plus(pendingWithdrawal.amount);
    updatePayerRegistryWithdrawnSnapshot(payer, timestamp, payer.withdrawn);

    payerRegistry.totalWithdrawn = payerRegistry.totalWithdrawn.plus(pendingWithdrawal.amount);
    updatePayerRegistryTotalWithdrawnSnapshot(timestamp, payerRegistry.totalWithdrawn);

    _updatePayerRegistryTotalWithdrawable(payerRegistry, timestamp);
}

function _requestWithdrawal(payerRegistry: PayerRegistry, payer: Payer, amount: BigInt, timestamp: i32): void {
    payerRegistry.totalPendingWithdrawals = payerRegistry.totalPendingWithdrawals.plus(amount);
    updatePayerRegistryTotalPendingWithdrawalsSnapshot(timestamp, payerRegistry.totalPendingWithdrawals);

    _decreaseBalance(payerRegistry, payer, amount, timestamp);
}

function _increaseBalance(payerRegistry: PayerRegistry, payer: Payer, amount: BigInt, timestamp: i32): BigInt {
    const startingBalance = payer.balance;

    payer.balance = payer.balance.plus(amount);
    updatePayerRegistryBalanceSnapshot(payer, timestamp, payer.balance);

    payerRegistry.totalBalances = payerRegistry.totalBalances.plus(amount);
    updatePayerRegistryTotalBalanceSnapshot(timestamp, payerRegistry.totalBalances);

    return _getDebt(startingBalance).minus(_getDebt(payer.balance));
}

function _decreaseBalance(payerRegistry: PayerRegistry, payer: Payer, amount: BigInt, timestamp: i32): BigInt {
    const startingBalance = payer.balance;

    payer.balance = payer.balance.minus(amount);
    updatePayerRegistryBalanceSnapshot(payer, timestamp, payer.balance);

    payerRegistry.totalBalances = payerRegistry.totalBalances.minus(amount);
    updatePayerRegistryTotalBalanceSnapshot(timestamp, payerRegistry.totalBalances);

    return _getDebt(payer.balance).minus(_getDebt(startingBalance));
}

function _getDebt(balance: BigInt): BigInt {
    return balance.lt(BigInt.fromI32(0)) ? balance.abs() : BigInt.fromI32(0);
}
