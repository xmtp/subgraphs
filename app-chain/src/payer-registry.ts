import { Address, BigInt, Timestamp } from '@graphprotocol/graph-ts';

import {
    PayerRegistryBalanceSnapshot,
    PayerRegistryPendingWithdrawalSnapshot,
    PayerRegistryWithdrawableTimestampSnapshot,
    PayerRegistryDepositedSnapshot,
    PayerRegistryIncurredDebtSnapshot,
    PayerRegistryRepaidDebtSnapshot,
    PayerRegistryWithdrawnSnapshot,
    PayerRegistryUsageSettledSnapshot,
    PayerRegistryDeposit,
    PayerRegistryWithdrawal,
    PayerRegistryUsageSettlement,
    Payer,
    PayerRegistryPausedSnapshot,
    PayerRegistryTotalDepositsSnapshot,
    PayerRegistryTotalDebtSnapshot,
    PayerRegistryWithdrawLockPeriodSnapshot,
    PayerRegistryMinimumDepositSnapshot,
    PayerRegistrySettlerSnapshot,
    PayerRegistryFeeDistributorSnapshot,
    PayerRegistryTotalBalanceSnapshot,
    PayerRegistryTotalPendingWithdrawalsSnapshot,
    PayerRegistryTotalDepositedSnapshot,
    PayerRegistryTotalIncurredDebtSnapshot,
    PayerRegistryTotalRepaidDebtSnapshot,
    PayerRegistryTotalWithdrawnSnapshot,
    PayerRegistryTotalUsageSettledSnapshot,
    PayerRegistryTotalExcessTransferredSnapshot,
    PayerRegistryBatchUsageSettlement,
    PayerRegistryExcessTransfer,
    PayerRegistry,
} from '../generated/schema';

import {
    Deposit as DepositEvent,
    ExcessTransferred as ExcessTransferredEvent,
    FeeDistributorUpdated as FeeDistributorUpdatedEvent,
    MinimumDepositUpdated as MinimumDepositUpdatedEvent,
    PauseStatusUpdated as PauseStatusUpdatedEvent,
    SettlerUpdated as SettlerUpdatedEvent,
    UsageSettled as UsageSettledEvent,
    WithdrawLockPeriodUpdated as WithdrawLockPeriodUpdatedEvent,
    WithdrawalCancelled as WithdrawalCancelledEvent,
    WithdrawalFinalized as WithdrawalFinalizedEvent,
    WithdrawalRequested as WithdrawalRequestedEvent,
} from '../generated/PayerRegistry/PayerRegistry';

import {
    getPayerRegistry,
    updatePayerRegistryFeeTokenBalanceSnapshot,
    _updatePayerRegistryTotalWithdrawable,
} from './common';

/* ============ Handlers ============ */

export function handleDeposit(event: DepositEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const amount = event.params.amount;
    const timestamp = event.block.timestamp.toI32();
    const payer = getPayer(payerRegistry, event.params.payer);

    // TODO: This is a hack to efficiently index the payer registry's fee token balance until we have a FeeToken/xUSD.
    payerRegistry.feeTokenBalance = payerRegistry.feeTokenBalance.plus(amount);
    updatePayerRegistryFeeTokenBalanceSnapshot(payerRegistry, timestamp, payerRegistry.feeTokenBalance);

    _deposit(payerRegistry, payer, amount, timestamp);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();

    payer.lastUpdate = timestamp;
    payer.save();

    const depositId = `deposit-${event.transaction.hash.toHexString()}-${event.logIndex.toI32().toString()}`;
    const deposit = new PayerRegistryDeposit(depositId);

    deposit.payerRegistry = payerRegistry.id;
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

    // TODO: This is a hack to efficiently index the payer registry's fee token balance until we have a FeeToken/xUSD.
    payerRegistry.feeTokenBalance = payerRegistry.feeTokenBalance.minus(amount);
    updatePayerRegistryFeeTokenBalanceSnapshot(payerRegistry, timestamp, payerRegistry.feeTokenBalance);

    _transferExcess(payerRegistry, amount, timestamp);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();

    const excessTransferId = `excessTransfer-${event.transaction.hash.toHexString()}-${event.logIndex.toI32().toString()}`;
    const excessTransfer = new PayerRegistryExcessTransfer(excessTransferId);

    excessTransfer.payerRegistry = payerRegistry.id;
    excessTransfer.amount = amount;
    excessTransfer.timestamp = timestamp;
    excessTransfer.transactionHash = event.transaction.hash.toHexString();
    excessTransfer.logIndex = event.logIndex;

    excessTransfer.save();
}

export function handleFeeDistributorUpdated(event: FeeDistributorUpdatedEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();

    payerRegistry.feeDistributor = event.params.feeDistributor.toHexString();
    updatePayerRegistryFeeDistributorSnapshot(payerRegistry, timestamp, payerRegistry.feeDistributor);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();
}

export function handleMinimumDepositUpdated(event: MinimumDepositUpdatedEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();

    payerRegistry.minimumDeposit = event.params.minimumDeposit;
    updatePayerRegistryMinimumDepositSnapshot(payerRegistry, timestamp, payerRegistry.minimumDeposit);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();
}

export function handlePauseStatusUpdated(event: PauseStatusUpdatedEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();

    payerRegistry.paused = event.params.paused;
    updatePayerRegistryPausedSnapshot(payerRegistry, timestamp, payerRegistry.paused);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();
}

export function handleSettlerUpdated(event: SettlerUpdatedEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();

    payerRegistry.settler = event.params.settler.toHexString();
    updatePayerRegistrySettlerSnapshot(payerRegistry, timestamp, payerRegistry.settler);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();
}

export function handleUsageSettled(event: UsageSettledEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const amount = event.params.amount;
    const timestamp = event.block.timestamp.toI32();
    const payer = getPayer(payerRegistry, event.params.payer);
    const transactionHash = event.transaction.hash.toHexString();

    _settleUsage(payerRegistry, payer, amount, timestamp);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();

    payer.lastUpdate = timestamp;
    payer.save();

    const batchUsageSettlement = getPayerRegistryBatchUsageSettlement(payerRegistry, transactionHash, timestamp);

    batchUsageSettlement.amount = batchUsageSettlement.amount.plus(amount);

    batchUsageSettlement.save();

    const usageSettlement = new PayerRegistryUsageSettlement(
        `usageSettlement-${transactionHash}-${event.logIndex.toI32().toString()}`
    );

    usageSettlement.payer = payer.id;
    usageSettlement.amount = amount;
    usageSettlement.batchUsageSettlement = batchUsageSettlement.id;
    usageSettlement.logIndex = event.logIndex;

    usageSettlement.save();
}

export function handleWithdrawLockPeriodUpdated(event: WithdrawLockPeriodUpdatedEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();

    payerRegistry.withdrawLockPeriod = event.params.withdrawLockPeriod.toI32();
    updatePayerRegistryWithdrawLockPeriodSnapshot(payerRegistry, timestamp, payerRegistry.withdrawLockPeriod);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();
}

export function handleWithdrawalCancelled(event: WithdrawalCancelledEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();
    const payer = getPayer(payerRegistry, event.params.payer);

    _cancelWithdrawal(payerRegistry, payer, timestamp);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();

    payer.lastUpdate = timestamp;
    payer.save();

    const withdrawal = getPayerRegistryWithdrawal(event.transaction.hash.toHexString(), event.logIndex);

    withdrawal.cancelTimestamp = timestamp;
    withdrawal.cancelTransactionHash = event.transaction.hash.toHexString();
    withdrawal.cancelLogIndex = event.logIndex;

    withdrawal.save();
}

export function handleWithdrawalFinalized(event: WithdrawalFinalizedEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();
    const payer = getPayer(payerRegistry, event.params.payer);

    // TODO: This is a hack to efficiently index the payer registry's fee token balance until we have a FeeToken/xUSD.
    payerRegistry.feeTokenBalance = payerRegistry.feeTokenBalance.minus(payer.pendingWithdrawal);
    updatePayerRegistryFeeTokenBalanceSnapshot(payerRegistry, timestamp, payerRegistry.feeTokenBalance);

    _finalizeWithdrawal(payerRegistry, payer, timestamp);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();

    payer.lastUpdate = timestamp;
    payer.save();

    const withdrawal = getPayerRegistryWithdrawal(event.transaction.hash.toHexString(), event.logIndex);

    withdrawal.finalizeTimestamp = timestamp;
    withdrawal.finalizeTransactionHash = event.transaction.hash.toHexString();
    withdrawal.finalizeLogIndex = event.logIndex;

    withdrawal.save();
}

export function handleWithdrawalRequested(event: WithdrawalRequestedEvent): void {
    const payerRegistry = getPayerRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();
    const payer = getPayer(payerRegistry, event.params.payer);
    const amount = event.params.amount;
    const withdrawableTimestamp = event.params.withdrawableTimestamp.toI32();

    _requestWithdrawal(payerRegistry, payer, amount, withdrawableTimestamp, timestamp);

    payerRegistry.lastUpdate = timestamp;
    payerRegistry.save();

    payer.lastUpdate = timestamp;
    payer.save();

    const withdrawal = getPayerRegistryWithdrawal(event.transaction.hash.toHexString(), event.logIndex);

    withdrawal.payerRegistry = payerRegistry.id;
    withdrawal.payer = payer.id;
    withdrawal.amount = amount;
    withdrawal.requestTimestamp = timestamp;
    withdrawal.requestTransactionHash = event.transaction.hash.toHexString();
    withdrawal.requestLogIndex = event.logIndex;

    withdrawal.save();
}

/* ============ Entity Helpers ============ */

function getPayer(payerRegistry: PayerRegistry, address: Address): Payer {
    const id = `payer-${address.toHexString()}`;

    let payer = Payer.load(id);

    if (payer) return payer;

    payer = new Payer(id);

    payer.lastUpdate = 0;
    payer.address = address.toHexString();
    payer.payerRegistry = payerRegistry.id;
    payer.balance = BigInt.fromI32(0);
    payer.pendingWithdrawal = BigInt.fromI32(0);
    payer.withdrawableTimestamp = 0;
    payer.deposited = BigInt.fromI32(0);
    payer.incurredDebt = BigInt.fromI32(0);
    payer.repaidDebt = BigInt.fromI32(0);
    payer.withdrawn = BigInt.fromI32(0);
    payer.usageSettled = BigInt.fromI32(0);

    return payer;
}

function getPayerRegistryBatchUsageSettlement(
    payerRegistry: PayerRegistry,
    transactionHash: string,
    timestamp: Timestamp
): PayerRegistryBatchUsageSettlement {
    const id = `payerRegistryBatchUsageSettlement-${transactionHash}`;

    let batchUsageSettlement = PayerRegistryBatchUsageSettlement.load(id);

    if (batchUsageSettlement) return batchUsageSettlement;

    batchUsageSettlement = new PayerRegistryBatchUsageSettlement(id);

    batchUsageSettlement.payerRegistry = payerRegistry.id;
    batchUsageSettlement.amount = BigInt.fromI32(0);
    batchUsageSettlement.timestamp = timestamp;
    batchUsageSettlement.transactionHash = transactionHash;

    return batchUsageSettlement;
}

function getPayerRegistryWithdrawal(transactionHash: string, logIndex: BigInt): PayerRegistryWithdrawal {
    const id = `payerRegistryWithdrawal-${transactionHash}-${logIndex.toString()}`;

    let withdrawal = PayerRegistryWithdrawal.load(id);

    if (withdrawal) return withdrawal;

    withdrawal = new PayerRegistryWithdrawal(id);

    withdrawal.payerRegistry = '';
    withdrawal.payer = '';
    withdrawal.amount = BigInt.fromI32(0);
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

function updatePayerRegistryBalanceSnapshot(payer: Payer, timestamp: Timestamp, value: BigInt): void {
    const id = `payerRegistryBalance-${payer.address}-${timestamp.toString()}`;

    let snapshot = PayerRegistryBalanceSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryBalanceSnapshot(id);

        snapshot.payer = payer.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryDepositedSnapshot(payer: Payer, timestamp: Timestamp, value: BigInt): void {
    const id = `payerRegistryDeposited-${payer.address}-${timestamp.toString()}`;

    let snapshot = PayerRegistryDepositedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryDepositedSnapshot(id);

        snapshot.payer = payer.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryIncurredDebtSnapshot(payer: Payer, timestamp: Timestamp, value: BigInt): void {
    const id = `payerRegistryIncurredDebt-${payer.address}-${timestamp.toString()}`;

    let snapshot = PayerRegistryIncurredDebtSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryIncurredDebtSnapshot(id);

        snapshot.payer = payer.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryRepaidDebtSnapshot(payer: Payer, timestamp: Timestamp, value: BigInt): void {
    const id = `payerRegistryRepaidDebt-${payer.address}-${timestamp.toString()}`;

    let snapshot = PayerRegistryRepaidDebtSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryRepaidDebtSnapshot(id);

        snapshot.payer = payer.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryUsageSettledSnapshot(payer: Payer, timestamp: Timestamp, value: BigInt): void {
    const id = `payerRegistryUsageSettled-${payer.address}-${timestamp.toString()}`;

    let snapshot = PayerRegistryUsageSettledSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryUsageSettledSnapshot(id);

        snapshot.payer = payer.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryPendingWithdrawalSnapshot(payer: Payer, timestamp: Timestamp, value: BigInt): void {
    const id = `payerRegistryPendingWithdrawal-${payer.address}-${timestamp.toString()}`;

    let snapshot = PayerRegistryPendingWithdrawalSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryPendingWithdrawalSnapshot(id);

        snapshot.payer = payer.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryWithdrawableTimestampSnapshot(payer: Payer, timestamp: Timestamp, value: Timestamp): void {
    const id = `payerRegistryWithdrawableTimestamp-${payer.address}-${timestamp.toString()}`;

    let snapshot = PayerRegistryWithdrawableTimestampSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryWithdrawableTimestampSnapshot(id);

        snapshot.payer = payer.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryWithdrawnSnapshot(payer: Payer, timestamp: Timestamp, value: BigInt): void {
    const id = `payerRegistryWithdrawn-${payer.address}-${timestamp.toString()}`;

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

function updatePayerRegistryTotalIncurredDebtSnapshot(
    payerRegistry: PayerRegistry,
    timestamp: Timestamp,
    value: BigInt
): void {
    const id = `payerRegistryTotalIncurredDebt-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalIncurredDebtSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalIncurredDebtSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalRepaidDebtSnapshot(
    payerRegistry: PayerRegistry,
    timestamp: Timestamp,
    value: BigInt
): void {
    const id = `payerRegistryTotalRepaidDebt-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalRepaidDebtSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalRepaidDebtSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalDebtSnapshot(payerRegistry: PayerRegistry, timestamp: Timestamp, value: BigInt): void {
    const id = `payerRegistryTotalDebt-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalDebtSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalDebtSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalDepositsSnapshot(
    payerRegistry: PayerRegistry,
    timestamp: Timestamp,
    value: BigInt
): void {
    const id = `payerRegistryTotalDeposits-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalDepositsSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalDepositsSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalBalanceSnapshot(
    payerRegistry: PayerRegistry,
    timestamp: Timestamp,
    value: BigInt
): void {
    const id = `payerRegistryTotalBalance-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalBalanceSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalBalanceSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalDepositedSnapshot(
    payerRegistry: PayerRegistry,
    timestamp: Timestamp,
    value: BigInt
): void {
    const id = `payerRegistryTotalDeposited-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalDepositedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalDepositedSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalExcessTransferredSnapshot(
    payerRegistry: PayerRegistry,
    timestamp: Timestamp,
    value: BigInt
): void {
    const id = `payerRegistryTotalExcessTransferred-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalExcessTransferredSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalExcessTransferredSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryFeeDistributorSnapshot(
    payerRegistry: PayerRegistry,
    timestamp: Timestamp,
    value: string
): void {
    const id = `payerRegistryFeeDistributor-${timestamp.toString()}`;

    let snapshot = PayerRegistryFeeDistributorSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryFeeDistributorSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryMinimumDepositSnapshot(
    payerRegistry: PayerRegistry,
    timestamp: Timestamp,
    value: BigInt
): void {
    const id = `payerRegistryMinimumDeposit-${timestamp.toString()}`;

    let snapshot = PayerRegistryMinimumDepositSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryMinimumDepositSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryPausedSnapshot(payerRegistry: PayerRegistry, timestamp: Timestamp, value: boolean): void {
    const id = `payerRegistryPaused-${timestamp.toString()}`;

    let snapshot = PayerRegistryPausedSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryPausedSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistrySettlerSnapshot(payerRegistry: PayerRegistry, timestamp: Timestamp, value: string): void {
    const id = `payerRegistrySettler-${timestamp.toString()}`;

    let snapshot = PayerRegistrySettlerSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistrySettlerSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalUsageSettledSnapshot(
    payerRegistry: PayerRegistry,
    timestamp: Timestamp,
    value: BigInt
): void {
    const id = `payerRegistryTotalUsageSettled-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalUsageSettledSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalUsageSettledSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryWithdrawLockPeriodSnapshot(
    payerRegistry: PayerRegistry,
    timestamp: Timestamp,
    value: i32
): void {
    const id = `payerRegistryWithdrawLockPeriod-${timestamp.toString()}`;

    let snapshot = PayerRegistryWithdrawLockPeriodSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryWithdrawLockPeriodSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalPendingWithdrawalsSnapshot(
    payerRegistry: PayerRegistry,
    timestamp: Timestamp,
    value: BigInt
): void {
    const id = `payerRegistryTotalPendingWithdrawals-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalPendingWithdrawalsSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalPendingWithdrawalsSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerRegistryTotalWithdrawnSnapshot(
    payerRegistry: PayerRegistry,
    timestamp: Timestamp,
    value: BigInt
): void {
    const id = `payerRegistryTotalWithdrawn-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalWithdrawnSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalWithdrawnSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

/* ============ Contract Stateful Tracking ============ */

function _deposit(payerRegistry: PayerRegistry, payer: Payer, amount: BigInt, timestamp: Timestamp): void {
    if (amount.equals(BigInt.fromI32(0))) return;

    const debtRepaid = _increaseBalance(payerRegistry, payer, amount, timestamp);

    payer.repaidDebt = payer.repaidDebt.plus(debtRepaid);
    updatePayerRegistryRepaidDebtSnapshot(payer, timestamp, payer.repaidDebt);

    payerRegistry.totalRepaidDebt = payerRegistry.totalRepaidDebt.plus(debtRepaid);
    updatePayerRegistryTotalRepaidDebtSnapshot(payerRegistry, timestamp, payerRegistry.totalRepaidDebt);

    payerRegistry.totalDebt = payerRegistry.totalDebt.minus(debtRepaid);
    updatePayerRegistryTotalDebtSnapshot(payerRegistry, timestamp, payerRegistry.totalDebt);

    payerRegistry.totalDeposits = payerRegistry.totalDeposits.plus(amount);
    updatePayerRegistryTotalDepositsSnapshot(payerRegistry, timestamp, payerRegistry.totalDeposits);

    payer.deposited = payer.deposited.plus(amount);
    updatePayerRegistryDepositedSnapshot(payer, timestamp, payer.deposited);

    payerRegistry.totalDeposited = payerRegistry.totalDeposited.plus(amount);
    updatePayerRegistryTotalDepositedSnapshot(payerRegistry, timestamp, payerRegistry.totalDeposited);

    _updatePayerRegistryTotalWithdrawable(payerRegistry, timestamp);
}

function _transferExcess(payerRegistry: PayerRegistry, amount: BigInt, timestamp: Timestamp): void {
    payerRegistry.totalExcessTransferred = payerRegistry.totalExcessTransferred.plus(amount);
    updatePayerRegistryTotalExcessTransferredSnapshot(payerRegistry, timestamp, payerRegistry.totalExcessTransferred);
}

function _settleUsage(payerRegistry: PayerRegistry, payer: Payer, amount: BigInt, timestamp: Timestamp): void {
    const debtIncurred = _decreaseBalance(payerRegistry, payer, amount, timestamp);

    payer.incurredDebt = payer.incurredDebt.plus(debtIncurred);
    updatePayerRegistryIncurredDebtSnapshot(payer, timestamp, payer.incurredDebt);

    payerRegistry.totalIncurredDebt = payerRegistry.totalIncurredDebt.plus(debtIncurred);
    updatePayerRegistryTotalIncurredDebtSnapshot(payerRegistry, timestamp, payerRegistry.totalIncurredDebt);

    payerRegistry.totalDeposits = payerRegistry.totalDeposits.minus(amount);
    updatePayerRegistryTotalDepositsSnapshot(payerRegistry, timestamp, payerRegistry.totalDeposits);

    payerRegistry.totalDebt = payerRegistry.totalDebt.plus(debtIncurred);
    updatePayerRegistryTotalDebtSnapshot(payerRegistry, timestamp, payerRegistry.totalDebt);

    payer.usageSettled = payer.usageSettled.plus(amount);
    updatePayerRegistryUsageSettledSnapshot(payer, timestamp, payer.usageSettled);

    payerRegistry.totalUsageSettled = payerRegistry.totalUsageSettled.plus(amount);
    updatePayerRegistryTotalUsageSettledSnapshot(payerRegistry, timestamp, payerRegistry.totalUsageSettled);

    _updatePayerRegistryTotalWithdrawable(payerRegistry, timestamp);
}

function _cancelWithdrawal(payerRegistry: PayerRegistry, payer: Payer, timestamp: Timestamp): void {
    const debtRepaid = _increaseBalance(payerRegistry, payer, payer.pendingWithdrawal, timestamp);

    payer.repaidDebt = payer.repaidDebt.plus(debtRepaid);
    updatePayerRegistryRepaidDebtSnapshot(payer, timestamp, payer.repaidDebt);

    payerRegistry.totalRepaidDebt = payerRegistry.totalRepaidDebt.plus(debtRepaid);
    updatePayerRegistryTotalRepaidDebtSnapshot(payerRegistry, timestamp, payerRegistry.totalRepaidDebt);

    payerRegistry.totalDebt = payerRegistry.totalDebt.minus(debtRepaid);
    updatePayerRegistryTotalDebtSnapshot(payerRegistry, timestamp, payerRegistry.totalDebt);

    payer.pendingWithdrawal = BigInt.fromI32(0);
    updatePayerRegistryPendingWithdrawalSnapshot(payer, timestamp, payer.pendingWithdrawal);

    payerRegistry.totalPendingWithdrawals = payerRegistry.totalPendingWithdrawals.minus(payer.pendingWithdrawal);
    updatePayerRegistryTotalPendingWithdrawalsSnapshot(payerRegistry, timestamp, payerRegistry.totalPendingWithdrawals);

    payer.withdrawableTimestamp = 0;
    updatePayerRegistryWithdrawableTimestampSnapshot(payer, timestamp, payer.withdrawableTimestamp);

    _updatePayerRegistryTotalWithdrawable(payerRegistry, timestamp);
}

function _finalizeWithdrawal(payerRegistry: PayerRegistry, payer: Payer, timestamp: Timestamp): void {
    payer.pendingWithdrawal = BigInt.fromI32(0);
    updatePayerRegistryPendingWithdrawalSnapshot(payer, timestamp, payer.pendingWithdrawal);

    payerRegistry.totalPendingWithdrawals = payerRegistry.totalPendingWithdrawals.minus(payer.pendingWithdrawal);
    updatePayerRegistryTotalPendingWithdrawalsSnapshot(payerRegistry, timestamp, payerRegistry.totalPendingWithdrawals);

    payer.withdrawableTimestamp = 0;
    updatePayerRegistryWithdrawableTimestampSnapshot(payer, timestamp, payer.withdrawableTimestamp);

    payerRegistry.totalDeposits = payerRegistry.totalDeposits.minus(payer.pendingWithdrawal);
    updatePayerRegistryTotalDepositsSnapshot(payerRegistry, timestamp, payerRegistry.totalDeposits);

    payer.withdrawn = payer.withdrawn.plus(payer.pendingWithdrawal);
    updatePayerRegistryWithdrawnSnapshot(payer, timestamp, payer.withdrawn);

    payerRegistry.totalWithdrawn = payerRegistry.totalWithdrawn.plus(payer.pendingWithdrawal);
    updatePayerRegistryTotalWithdrawnSnapshot(payerRegistry, timestamp, payerRegistry.totalWithdrawn);

    _updatePayerRegistryTotalWithdrawable(payerRegistry, timestamp);
}

function _requestWithdrawal(
    payerRegistry: PayerRegistry,
    payer: Payer,
    amount: BigInt,
    withdrawableTimestamp: Timestamp,
    timestamp: Timestamp
): void {
    payer.pendingWithdrawal = amount;
    updatePayerRegistryPendingWithdrawalSnapshot(payer, timestamp, payer.pendingWithdrawal);

    payerRegistry.totalPendingWithdrawals = payerRegistry.totalPendingWithdrawals.plus(payer.pendingWithdrawal);
    updatePayerRegistryTotalPendingWithdrawalsSnapshot(payerRegistry, timestamp, payerRegistry.totalPendingWithdrawals);

    payer.withdrawableTimestamp = withdrawableTimestamp;
    updatePayerRegistryWithdrawableTimestampSnapshot(payer, timestamp, payer.withdrawableTimestamp);

    _decreaseBalance(payerRegistry, payer, amount, timestamp);
}

function _increaseBalance(payerRegistry: PayerRegistry, payer: Payer, amount: BigInt, timestamp: Timestamp): BigInt {
    const startingBalance = payer.balance;

    payer.balance = payer.balance.plus(amount);
    updatePayerRegistryBalanceSnapshot(payer, timestamp, payer.balance);

    payerRegistry.totalBalances = payerRegistry.totalBalances.plus(amount);
    updatePayerRegistryTotalBalanceSnapshot(payerRegistry, timestamp, payerRegistry.totalBalances);

    return _getDebt(startingBalance).minus(_getDebt(payer.balance));
}

function _decreaseBalance(payerRegistry: PayerRegistry, payer: Payer, amount: BigInt, timestamp: Timestamp): BigInt {
    const startingBalance = payer.balance;

    payer.balance = payer.balance.minus(amount);
    updatePayerRegistryBalanceSnapshot(payer, timestamp, payer.balance);

    payerRegistry.totalBalances = payerRegistry.totalBalances.minus(amount);
    updatePayerRegistryTotalBalanceSnapshot(payerRegistry, timestamp, payerRegistry.totalBalances);

    return _getDebt(payer.balance).minus(_getDebt(startingBalance));
}

function _getDebt(balance: BigInt): BigInt {
    return balance.lt(BigInt.fromI32(0)) ? balance.abs() : BigInt.fromI32(0);
}
