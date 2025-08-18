import { Address, Timestamp } from '@graphprotocol/graph-ts';

import { AppChainParameterRegistry, Parameter, ParameterValueSnapshot } from '../generated/schema';

import { ParameterSet as ParameterSetEvent } from '../generated/AppChainParameterRegistry/AppChainParameterRegistry';

/* ============ Handlers ============ */

export function handleParameterSet(event: ParameterSetEvent): void {
    const registry = getAppChainParameterRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();

    registry.lastUpdate = timestamp;
    registry.save();

    const parameter = getParameter(event.params.key.toHexString());

    parameter.value = event.params.value.toHexString();
    updateParameterValueSnapshot(parameter, timestamp, parameter.value);

    parameter.lastUpdate = timestamp;
    parameter.save();
}

/* ============ Entity Helpers ============ */

export function getAppChainParameterRegistry(appChainParameterRegistryAddress: Address): AppChainParameterRegistry {
    const id = `AppChainParameterRegistry-${appChainParameterRegistryAddress.toHexString()}`;

    let registry = AppChainParameterRegistry.load(id);

    if (registry) return registry;

    registry = new AppChainParameterRegistry(id);

    registry.lastUpdate = 0;
    registry.save();

    return registry;
}

export function getParameter(key: string): Parameter {
    const id = `Parameter-${key}`;

    let parameter = Parameter.load(id);

    if (parameter) return parameter;

    parameter = new Parameter(id);

    parameter.lastUpdate = 0;
    parameter.key = key;
    parameter.value = '';

    parameter.save();

    return parameter;
}

/* ============ Snapshot Helpers ============ */

function updateParameterValueSnapshot(parameter: Parameter, timestamp: Timestamp, value: string): void {
    const id = `ParameterValueSnapshot-${parameter.key}-${timestamp.toString()}`;

    let snapshot = ParameterValueSnapshot.load(id);

    if (!snapshot) {
        snapshot = new ParameterValueSnapshot(id);

        snapshot.parameter = parameter.id;
        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}
