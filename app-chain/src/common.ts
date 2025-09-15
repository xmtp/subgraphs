import { Address, BigInt } from '@graphprotocol/graph-ts';

import { Account, FeesSnapshot } from '../generated/schema';

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
