import { BigInt } from '@graphprotocol/graph-ts';

import {
    PayerReport,
    PayerReportFeesSettledSnapshot,
    PayerReportIsSettledSnapshot,
    PayerReportSubsetSettlement,
} from '../generated/schema';

import {
    PayerReportSubmitted as PayerReportSubmittedEvent,
    PayerReportSubsetSettled as PayerReportSubsetSettledEvent,
} from '../generated/PayerReportManager/PayerReportManager';

/* ============ Handlers ============ */

export function handlePayerReportSubmitted(event: PayerReportSubmittedEvent): void {
    const originatorNodeId = event.params.originatorNodeId.toI32();
    const payerReportIndex = event.params.payerReportIndex;
    const timestamp = event.block.timestamp.toI32();

    const payerReport = getPayerReport(originatorNodeId, payerReportIndex);

    payerReport.startSequenceId = event.params.startSequenceId;
    payerReport.endSequenceId = event.params.endSequenceId;
    payerReport.endMinuteSinceEpoch = event.params.endMinuteSinceEpoch.toI32();
    payerReport.feesSettled = BigInt.fromI32(0);
    payerReport.offset = 0;
    payerReport.isSettled = event.params.payersMerkleRoot.toHexString() == '0x0000000000000000000000000000000000000000000000000000000000000000';
    payerReport.protocolFeeRate = 0; // Will be updated when settlement occurs
    payerReport.payersMerkleRoot = event.params.payersMerkleRoot.toHexString();

    // Convert uint32[] to Int[]
    const nodeIds: i32[] = [];
    for (let i = 0; i < event.params.nodeIds.length; i++) {
        nodeIds.push(event.params.nodeIds[i].toI32());
    }
    payerReport.nodeIds = nodeIds;

    payerReport.submittedTimestamp = timestamp;
    payerReport.submittedTransactionHash = event.transaction.hash.toHexString();
    payerReport.lastUpdate = timestamp;

    payerReport.save();

    // Create initial snapshots
    updatePayerReportFeesSettledSnapshot(payerReport, timestamp, payerReport.feesSettled);
    updatePayerReportIsSettledSnapshot(payerReport, timestamp, payerReport.isSettled);
}

export function handlePayerReportSubsetSettled(event: PayerReportSubsetSettledEvent): void {
    const originatorNodeId = event.params.originatorNodeId.toI32();
    const payerReportIndex = event.params.payerReportIndex;
    const timestamp = event.block.timestamp.toI32();
    const transactionHash = event.transaction.hash.toHexString();
    const logIndex = event.logIndex;

    const payerReport = getPayerReport(originatorNodeId, payerReportIndex);

    // Update feesSettled
    payerReport.feesSettled = payerReport.feesSettled.plus(event.params.feesSettled);
    updatePayerReportFeesSettledSnapshot(payerReport, timestamp, payerReport.feesSettled);

    // Update isSettled if remaining is 0
    if (event.params.remaining.toI32() == 0) {
        payerReport.isSettled = true;
        updatePayerReportIsSettledSnapshot(payerReport, timestamp, payerReport.isSettled);
    }

    payerReport.lastUpdate = timestamp;
    payerReport.save();

    // Create subset settlement event entity
    const subsetSettlementId = `PayerReportSubsetSettlement-${transactionHash}-${logIndex.toString()}`;
    const subsetSettlement = new PayerReportSubsetSettlement(subsetSettlementId);

    subsetSettlement.payerReport = payerReport.id;
    subsetSettlement.count = event.params.count.toI32();
    subsetSettlement.remaining = event.params.remaining.toI32();
    subsetSettlement.feesSettled = event.params.feesSettled;
    subsetSettlement.timestamp = timestamp;
    subsetSettlement.transactionHash = transactionHash;
    subsetSettlement.logIndex = logIndex;

    subsetSettlement.save();
}

/* ============ Entity Helpers ============ */

function getPayerReport(originatorNodeId: i32, payerReportIndex: BigInt): PayerReport {
    const id = `PayerReport-${originatorNodeId.toString()}-${payerReportIndex.toString()}`;

    let payerReport = PayerReport.load(id);

    if (payerReport) return payerReport;

    payerReport = new PayerReport(id);

    payerReport.lastUpdate = 0;
    payerReport.originatorNodeId = originatorNodeId;
    payerReport.payerReportIndex = payerReportIndex;
    payerReport.startSequenceId = BigInt.fromI32(0);
    payerReport.endSequenceId = BigInt.fromI32(0);
    payerReport.endMinuteSinceEpoch = 0;
    payerReport.feesSettled = BigInt.fromI32(0);
    payerReport.offset = 0;
    payerReport.isSettled = false;
    payerReport.protocolFeeRate = 0;
    payerReport.payersMerkleRoot = '';
    payerReport.nodeIds = [];
    payerReport.submittedTimestamp = 0;
    payerReport.submittedTransactionHash = '';

    return payerReport;
}

/* ============ PayerReport Snapshot Helpers ============ */

function updatePayerReportFeesSettledSnapshot(payerReport: PayerReport, timestamp: i32, value: BigInt): void {
    const id = `PayerReportFeesSettledSnapshot-${payerReport.id}-${timestamp.toString()}`;

    let snapshot = PayerReportFeesSettledSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerReportFeesSettledSnapshot(id);

        snapshot.payerReport = payerReport.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updatePayerReportIsSettledSnapshot(payerReport: PayerReport, timestamp: i32, value: boolean): void {
    const id = `PayerReportIsSettledSnapshot-${payerReport.id}-${timestamp.toString()}`;

    let snapshot = PayerReportIsSettledSnapshot.load(id);

    if (!snapshot) {
        snapshot = new PayerReportIsSettledSnapshot(id);

        snapshot.payerReport = payerReport.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}
