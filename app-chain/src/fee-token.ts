import { Address, dataSource } from '@graphprotocol/graph-ts';
import { Transfer as TransferEvent } from '../generated/FeeToken/FeeToken';
import { getPayerRegistry, updatePayerRegistryFeeTokenBalanceSnapshot, _updatePayerRegistryExcess } from './common';

const PAYER_REGISTRY_ADDRESS = Address.fromString(dataSource.context().getString('payerRegistry'));

/* ============ Handlers ============ */

// For now, this is too intensive on USDC, but will be feasible on FeeToken/xUSD.
export function handleTransfer(event: TransferEvent): void {
    const sender = event.params.from;
    const recipient = event.params.to;
    const amount = event.params.value;
    const timestamp = event.block.timestamp.toI32();

    if (!sender.equals(PAYER_REGISTRY_ADDRESS) && !recipient.equals(PAYER_REGISTRY_ADDRESS)) return;

    const payerRegistry = getPayerRegistry(PAYER_REGISTRY_ADDRESS);

    if (sender.equals(PAYER_REGISTRY_ADDRESS)) {
        payerRegistry.feeTokenBalance = payerRegistry.feeTokenBalance.minus(amount);
    }

    if (recipient.equals(PAYER_REGISTRY_ADDRESS)) {
        payerRegistry.feeTokenBalance = payerRegistry.feeTokenBalance.plus(amount);
    }

    updatePayerRegistryFeeTokenBalanceSnapshot(payerRegistry, timestamp, payerRegistry.feeTokenBalance);

    // Needs to follow any `totalWithdrawable` and `feeTokenBalance` updates.
    _updatePayerRegistryExcess(payerRegistry, timestamp);

    payerRegistry.lastUpdate = timestamp;

    payerRegistry.save();
}
