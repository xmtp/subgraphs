import { Address, BigInt, Timestamp, dataSource } from '@graphprotocol/graph-ts';

import {
    Account,
    DailyPayerUsage,
    DailyRegistryUsage,
    Payer,
    PayerRegistry,
    PayerRegistryExcessSnapshot,
    PayerRegistryTotalWithdrawableSnapshot,
} from '../generated/schema';

const ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000');
const STARTING_IMPLEMENTATION = dataSource.context().getString('startingImplementation');

/* ============ Entity Helpers ============ */

export function getPayerRegistry(address: Address): PayerRegistry {
    const id = `PayerRegistry-${address.toHexString()}`;

    let payerRegistry = PayerRegistry.load(id);

    if (payerRegistry) return payerRegistry;

    payerRegistry = new PayerRegistry(id);

    payerRegistry.lastUpdate = 0;
    payerRegistry.address = address.toHexString();
    payerRegistry.implementation = STARTING_IMPLEMENTATION;
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
    account.address = address.toHexString();
    account.feeTokenBalance = BigInt.fromI32(0);
    account.underlyingFeeTokenBalance = BigInt.fromI32(0);
    account.gatewayWithdrawalsReceived = BigInt.fromI32(0);
    account.feeTokenReceived = BigInt.fromI32(0);
    account.feeTokenSent = BigInt.fromI32(0);
    account.feeTokenMinted = BigInt.fromI32(0);
    account.feeTokenBurned = BigInt.fromI32(0);

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

/* ============ Daily Time Series Helpers ============ */

/**
 * Converts a block timestamp (seconds since epoch) to a UTC date key (YYYY-MM-DD)
 */
export function getDateKey(timestamp: i32): string {
    const SECONDS_PER_DAY = 86400;
    const daysSinceEpoch = timestamp / SECONDS_PER_DAY;
    const midnightTimestamp = daysSinceEpoch * SECONDS_PER_DAY;

    // Convert to i64 before multiplying by 1000 to avoid i32 overflow
    const date = new Date(i64(midnightTimestamp) * 1000);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();

    const monthStr = month < 10 ? '0' + month.toString() : month.toString();
    const dayStr = day < 10 ? '0' + day.toString() : day.toString();

    return year.toString() + '-' + monthStr + '-' + dayStr;
}

/**
 * Gets the midnight UTC timestamp for a given block timestamp
 */
export function getMidnightTimestamp(timestamp: i32): i32 {
    const SECONDS_PER_DAY = 86400;
    const daysSinceEpoch = timestamp / SECONDS_PER_DAY;
    return daysSinceEpoch * SECONDS_PER_DAY;
}

/**
 * Upserts a DailyPayerUsage entity for the given payer and timestamp
 */
export function upsertDailyPayerUsage(payer: Payer, timestamp: i32, blockNumber: BigInt): DailyPayerUsage {
    const dateKey = getDateKey(timestamp);
    const id = `DailyPayerUsage-${payer.address}-${dateKey}`;

    let dailyUsage = DailyPayerUsage.load(id);

    if (!dailyUsage) {
        dailyUsage = new DailyPayerUsage(id);
        dailyUsage.date = dateKey;
        dailyUsage.dateTimestamp = getMidnightTimestamp(timestamp);
        dailyUsage.payer = payer.id;

        dailyUsage.feesSettled = BigInt.fromI32(0);
        dailyUsage.deposited = BigInt.fromI32(0);
        dailyUsage.withdrawn = BigInt.fromI32(0);
        dailyUsage.incurredDebt = BigInt.fromI32(0);
        dailyUsage.repaidDebt = BigInt.fromI32(0);
        dailyUsage.eventCount = 0;
    }

    dailyUsage.lastUpdatedBlock = blockNumber;

    return dailyUsage;
}

/**
 * Upserts a DailyRegistryUsage entity for the given timestamp
 */
export function upsertDailyRegistryUsage(timestamp: i32, blockNumber: BigInt): DailyRegistryUsage {
    const dateKey = getDateKey(timestamp);
    const id = `DailyRegistryUsage-${dateKey}`;

    let dailyUsage = DailyRegistryUsage.load(id);

    if (!dailyUsage) {
        dailyUsage = new DailyRegistryUsage(id);
        dailyUsage.date = dateKey;
        dailyUsage.dateTimestamp = getMidnightTimestamp(timestamp);

        dailyUsage.totalDeposited = BigInt.fromI32(0);
        dailyUsage.totalWithdrawn = BigInt.fromI32(0);
        dailyUsage.totalUsageSettled = BigInt.fromI32(0);
        dailyUsage.totalIncurredDebt = BigInt.fromI32(0);
        dailyUsage.totalRepaidDebt = BigInt.fromI32(0);
        dailyUsage.totalExcessTransferred = BigInt.fromI32(0);
        dailyUsage.eventCount = 0;
    }

    dailyUsage.lastUpdatedBlock = blockNumber;

    return dailyUsage;
}
