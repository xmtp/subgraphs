import { Address, Timestamp } from '@graphprotocol/graph-ts';

import {
    AppChainParameterRegistry,
    AppChainParameterRegistryParameter,
    AppChainParameterRegistryParameterValueSnapshot,
} from '../generated/schema';

import { ParameterSet as ParameterSetEvent } from '../generated/AppChainParameterRegistry/AppChainParameterRegistry';

/* ============ Handlers ============ */

export function handleParameterSet(event: ParameterSetEvent): void {
    const registry = getAppChainParameterRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();

    registry.lastUpdate = timestamp;
    registry.save();

    const parameter = getAppChainParameterRegistryParameter(event.params.key.toString());

    parameter.value = event.params.value.toHexString();
    updateAppChainRegistryParameterValueSnapshot(parameter, timestamp, parameter.value);

    parameter.lastUpdate = timestamp;
    parameter.save();
}

/* ============ Entity Helpers ============ */

export function getAppChainParameterRegistry(appChainParameterRegistryAddress: Address): AppChainParameterRegistry {
    const id = `appChainParameterRegistry-${appChainParameterRegistryAddress.toHexString()}`;

    let registry = AppChainParameterRegistry.load(id);

    if (registry) return registry;

    registry = new AppChainParameterRegistry(id);

    registry.lastUpdate = 0;
    registry.save();

    return registry;
}

export function getAppChainParameterRegistryParameter(key: string): AppChainParameterRegistryParameter {
    const id = `appChainParameterRegistryParameter-${key}`;

    let parameter = AppChainParameterRegistryParameter.load(id);

    if (parameter) return parameter;

    parameter = new AppChainParameterRegistryParameter(id);

    parameter.lastUpdate = 0;
    parameter.key = key;
    parameter.value = '';

    parameter.save();

    return parameter;
}

/* ============ Snapshot Helpers ============ */

function updateAppChainRegistryParameterValueSnapshot(
    parameter: AppChainParameterRegistryParameter,
    timestamp: Timestamp,
    value: string
): void {
    const id = `appChainParameterRegistryParameterValueSnapshot-${parameter.key}-${timestamp.toString()}`;

    let snapshot = AppChainParameterRegistryParameterValueSnapshot.load(id);

    if (!snapshot) {
        snapshot = new AppChainParameterRegistryParameterValueSnapshot(id);

        snapshot.parameter = parameter.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}
