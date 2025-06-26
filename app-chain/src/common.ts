import { Address, BigInt, Timestamp } from '@graphprotocol/graph-ts';

import {
    PayerRegistry,
    PayerRegistryExcessSnapshot,
    PayerRegistryFeeTokenBalanceSnapshot,
    PayerRegistryTotalWithdrawableSnapshot,
} from '../generated/schema';

const ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000');

/* ============ Entity Helpers ============ */

export function getPayerRegistry(payerRegistryAddress: Address): PayerRegistry {
    const id = `payerRegistry-${payerRegistryAddress.toHexString()}`;

    let payerRegistry = PayerRegistry.load(id);

    if (payerRegistry) return payerRegistry;

    payerRegistry = new PayerRegistry(id);

    payerRegistry.lastUpdate = 0;
    payerRegistry.paused = false;
    payerRegistry.totalDeposits = BigInt.fromI32(0);
    payerRegistry.totalDebt = BigInt.fromI32(0);
    payerRegistry.withdrawLockPeriod = 0;
    payerRegistry.minimumDeposit = BigInt.fromI32(0);
    payerRegistry.settler = ZERO_ADDRESS.toHexString();
    payerRegistry.feeDistributor = ZERO_ADDRESS.toHexString();
    payerRegistry.feeTokenBalance = BigInt.fromI32(0);
    payerRegistry.totalWithdrawable = BigInt.fromI32(0);
    payerRegistry.excess = BigInt.fromI32(0);
    payerRegistry.totalBalances = BigInt.fromI32(0);
    payerRegistry.totalPendingWithdrawals = BigInt.fromI32(0);
    payerRegistry.totalDeposited = BigInt.fromI32(0);
    payerRegistry.totalIncurredDebt = BigInt.fromI32(0);
    payerRegistry.totalRepaidDebt = BigInt.fromI32(0);
    payerRegistry.totalWithdrawn = BigInt.fromI32(0);
    payerRegistry.totalUsageSettled = BigInt.fromI32(0);
    payerRegistry.totalExcessTransferred = BigInt.fromI32(0);

    return payerRegistry;
}

/* ============ Payer Registry Snapshot Helpers ============ */

export function updatePayerRegistryFeeTokenBalanceSnapshot(
    payerRegistry: PayerRegistry,
    timestamp: Timestamp,
    value: BigInt
): void {
    const id = `payerRegistryFeeTokenBalance-${timestamp.toString()}`;

    let snapshot = PayerRegistryFeeTokenBalanceSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryFeeTokenBalanceSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

export function updatePayerRegistryTotalWithdrawableSnapshot(
    payerRegistry: PayerRegistry,
    timestamp: Timestamp,
    value: BigInt
): void {
    const id = `payerRegistryTotalWithdrawable-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalWithdrawableSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalWithdrawableSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

export function updatePayerRegistryExcessSnapshot(
    payerRegistry: PayerRegistry,
    timestamp: Timestamp,
    value: BigInt
): void {
    const id = `payerRegistryExcess-${timestamp.toString()}`;

    let snapshot = PayerRegistryExcessSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryExcessSnapshot(id);

        snapshot.payerRegistry = payerRegistry.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

/* ============ Contract Stateful Tracking ============ */

export function _updatePayerRegistryTotalWithdrawable(payerRegistry: PayerRegistry, timestamp: Timestamp): void {
    payerRegistry.totalWithdrawable = _getTotalWithdrawable(payerRegistry);
    updatePayerRegistryTotalWithdrawableSnapshot(payerRegistry, timestamp, payerRegistry.totalWithdrawable);

    _updatePayerRegistryExcess(payerRegistry, timestamp);
}

export function _updatePayerRegistryExcess(payerRegistry: PayerRegistry, timestamp: Timestamp): void {
    payerRegistry.excess = _getExcess(payerRegistry);
    updatePayerRegistryExcessSnapshot(payerRegistry, timestamp, payerRegistry.excess);
}

export function _getTotalWithdrawable(payerRegistry: PayerRegistry): BigInt {
    return payerRegistry.totalDeposits.plus(payerRegistry.totalDebt);
}

export function _getExcess(payerRegistry: PayerRegistry): BigInt {
    return payerRegistry.feeTokenBalance.gt(payerRegistry.totalWithdrawable)
        ? payerRegistry.feeTokenBalance.minus(payerRegistry.totalWithdrawable)
        : BigInt.fromI32(0);
}
