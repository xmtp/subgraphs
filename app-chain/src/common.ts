import { Address, BigInt } from '@graphprotocol/graph-ts';

import { Account, DailyAccountUsage, DailyGlobalUsage, FeesSnapshot } from '../generated/schema';

export const ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000');

/* ============ Entity Helpers ============ */

export function getAccount(address: Address): Account {
    const id = `Account-${address.toHexString()}`;

    let account = Account.load(id);

    if (account) return account;

    account = new Account(id);

    account.lastUpdate = 0;
    account.address = address.toHexString();
    account.groupMessagesSent = BigInt.fromI32(0);
    account.groupMessageBytesSent = BigInt.fromI32(0);
    account.groupMessageFees = BigInt.fromI32(0);
    account.identityUpdatesCreated = BigInt.fromI32(0);
    account.identityUpdateBytesCreated = BigInt.fromI32(0);
    account.identityUpdateFees = BigInt.fromI32(0);
    account.fees = BigInt.fromI32(0);
    account.depositsReceived = BigInt.fromI32(0);

    return account;
}

/* ============ Account Snapshot Helpers ============ */

export function updateAccountFeesSnapshot(account: Account, timestamp: i32, value: BigInt): void {
    const id = `TransactionFees-${account.address}-${timestamp.toString()}`;

    let snapshot = FeesSnapshot.load(id);

    if (!snapshot) {
        snapshot = new FeesSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
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
 * Upserts a DailyAccountUsage entity for the given account and timestamp
 */
export function upsertDailyAccountUsage(account: Account, timestamp: i32, blockNumber: BigInt): DailyAccountUsage {
    const dateKey = getDateKey(timestamp);
    const id = `DailyAccountUsage-${account.address}-${dateKey}`;

    let dailyUsage = DailyAccountUsage.load(id);

    if (!dailyUsage) {
        dailyUsage = new DailyAccountUsage(id);
        dailyUsage.date = dateKey;
        dailyUsage.dateTimestamp = getMidnightTimestamp(timestamp);
        dailyUsage.account = account.id;

        dailyUsage.groupMessagesSent = BigInt.fromI32(0);
        dailyUsage.groupMessageBytesSent = BigInt.fromI32(0);
        dailyUsage.groupMessageFees = BigInt.fromI32(0);
        dailyUsage.identityUpdatesCreated = BigInt.fromI32(0);
        dailyUsage.identityUpdateBytesCreated = BigInt.fromI32(0);
        dailyUsage.identityUpdateFees = BigInt.fromI32(0);
        dailyUsage.depositsReceived = BigInt.fromI32(0);
        dailyUsage.totalFees = BigInt.fromI32(0);
        dailyUsage.eventCount = 0;
    }

    dailyUsage.lastUpdatedBlock = blockNumber;

    return dailyUsage;
}

/**
 * Upserts a DailyGlobalUsage entity for the given timestamp
 */
export function upsertDailyGlobalUsage(timestamp: i32, blockNumber: BigInt): DailyGlobalUsage {
    const dateKey = getDateKey(timestamp);
    const id = `DailyGlobalUsage-${dateKey}`;

    let dailyUsage = DailyGlobalUsage.load(id);

    if (!dailyUsage) {
        dailyUsage = new DailyGlobalUsage(id);
        dailyUsage.date = dateKey;
        dailyUsage.dateTimestamp = getMidnightTimestamp(timestamp);

        dailyUsage.totalGroupMessagesSent = BigInt.fromI32(0);
        dailyUsage.totalGroupMessageBytesSent = BigInt.fromI32(0);
        dailyUsage.totalGroupMessageFees = BigInt.fromI32(0);
        dailyUsage.totalIdentityUpdatesCreated = BigInt.fromI32(0);
        dailyUsage.totalIdentityUpdateBytesCreated = BigInt.fromI32(0);
        dailyUsage.totalIdentityUpdateFees = BigInt.fromI32(0);
        dailyUsage.totalDepositsReceived = BigInt.fromI32(0);
        dailyUsage.totalWithdrawn = BigInt.fromI32(0);
        dailyUsage.eventCount = 0;
    }

    dailyUsage.lastUpdatedBlock = blockNumber;

    return dailyUsage;
}
