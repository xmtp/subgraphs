import { Address, BigInt, Timestamp } from '@graphprotocol/graph-ts';

import {
    Account,
    PayerRegistry,
    PayerRegistryExcessSnapshot,
    PayerRegistryTotalWithdrawableSnapshot,
} from '../generated/schema';

const ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000');

/* ============ Entity Helpers ============ */

export function getPayerRegistry(address: Address): PayerRegistry {
    const id = `PayerRegistry-${address.toHexString()}`;

    let payerRegistry = PayerRegistry.load(id);

    if (payerRegistry) return payerRegistry;

    payerRegistry = new PayerRegistry(id);

    payerRegistry.lastUpdate = 0;
    payerRegistry.address = address.toHexString();
    payerRegistry.paused = false;
    payerRegistry.totalDeposits = BigInt.fromI32(0);
    payerRegistry.totalDebt = BigInt.fromI32(0);
    payerRegistry.withdrawLockPeriod = 0;
    payerRegistry.minimumDeposit = BigInt.fromI32(0);
    payerRegistry.settler = ZERO_ADDRESS.toHexString();
    payerRegistry.feeDistributor = ZERO_ADDRESS.toHexString();
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

export function getAccount(address: Address): Account {
    const id = `Account-${address.toHexString()}`;

    let account = Account.load(id);

    if (account) return account;

    account = new Account(id);

    account.lastUpdate = 0;
    account.feeTokenBalance = BigInt.fromI32(0);
    account.underlyingFeeTokenBalance = BigInt.fromI32(0);
    account.gatewayWithdrawalsReceived = BigInt.fromI32(0);

    return account;
}

/* ============ Payer Registry Snapshot Helpers ============ */

export function updatePayerRegistryTotalWithdrawableSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `PayerRegistryTotalWithdrawableSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistryTotalWithdrawableSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryTotalWithdrawableSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

export function updatePayerRegistryExcessSnapshot(timestamp: Timestamp, value: BigInt): void {
    const id = `PayerRegistryExcessSnapshot-${timestamp.toString()}`;

    let snapshot = PayerRegistryExcessSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerRegistryExcessSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

/* ============ Contract Stateful Tracking ============ */

export function _updatePayerRegistryTotalWithdrawable(payerRegistry: PayerRegistry, timestamp: Timestamp): void {
    payerRegistry.totalWithdrawable = _getTotalWithdrawable(payerRegistry);
    updatePayerRegistryTotalWithdrawableSnapshot(timestamp, payerRegistry.totalWithdrawable);

    _updatePayerRegistryExcess(payerRegistry, timestamp);
}

export function _updatePayerRegistryExcess(payerRegistry: PayerRegistry, timestamp: Timestamp): void {
    payerRegistry.excess = _getExcess(payerRegistry);
    updatePayerRegistryExcessSnapshot(timestamp, payerRegistry.excess);
}

export function _getTotalWithdrawable(payerRegistry: PayerRegistry): BigInt {
    return payerRegistry.totalDeposits.plus(payerRegistry.totalDebt);
}

export function _getExcess(payerRegistry: PayerRegistry): BigInt {
    const payerRegistryFeeTokenBalance = getAccount(Address.fromString(payerRegistry.address)).feeTokenBalance;

    return payerRegistryFeeTokenBalance.gt(payerRegistry.totalWithdrawable)
        ? payerRegistryFeeTokenBalance.minus(payerRegistry.totalWithdrawable)
        : BigInt.fromI32(0);
}
