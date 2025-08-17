import { Address, BigInt, Timestamp } from '@graphprotocol/graph-ts';

import { Account, TransactionFeesSnapshot } from '../generated/schema';

export const ZERO_ADDRESS = Address.fromString('0x0000000000000000000000000000000000000000');

/* ============ Entity Helpers ============ */

export function getAccount(address: Address): Account {
    const id = `account-${address.toHexString()}`;

    let account = Account.load(id);

    if (account) return account;

    account = new Account(id);

    account.lastUpdate = 0;
    account.address = address.toHexString();
    account.groupMessagesSent = BigInt.fromI32(0);
    account.groupMessageBytesSent = BigInt.fromI32(0);
    account.groupMessageTransactionFees = BigInt.fromI32(0);
    account.identityUpdatesCreated = BigInt.fromI32(0);
    account.identityUpdateBytesCreated = BigInt.fromI32(0);
    account.identityUpdateTransactionFees = BigInt.fromI32(0);
    account.transactionFees = BigInt.fromI32(0);
    account.withdrawn = BigInt.fromI32(0);
    account.depositsReceived = BigInt.fromI32(0);

    return account;
}

/* ============ Account Snapshot Helpers ============ */

export function updateAccountTransactionFeesSnapshot(account: Account, timestamp: Timestamp, value: BigInt): void {
    const id = `accountTransactionFees-${account.address}-${timestamp.toString()}`;

    let snapshot = TransactionFeesSnapshot.load(id);

    if (!snapshot) {
        snapshot = new TransactionFeesSnapshot(id);

        snapshot.account = account.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}
