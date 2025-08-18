import { Address, Bytes, Timestamp } from '@graphprotocol/graph-ts';
import { ethereum } from '@graphprotocol/graph-ts/chain/ethereum';

import { AppChainParameterRegistry, Parameter, ParameterValueSnapshot } from '../generated/schema';

import { ParameterSet as ParameterSetEvent } from '../generated/AppChainParameterRegistry/AppChainParameterRegistry';
import { ParameterSet as IndexedParameterSetEvent } from '../generated/AppChainParameterRegistry-v0.5.5/AppChainParameterRegistry_v0_5_5';

/* ============ Handlers ============ */

const KEYS = [
    'xmtp.groupMessageBroadcaster.paused',
    'xmtp.identityUpdateBroadcaster.paused',
    'xmtp.groupMessageBroadcaster.payloadBootstrapper',
    'xmtp.identityUpdateBroadcaster.payloadBootstrapper',
    'xmtp.groupMessageBroadcaster.maxPayloadSize',
    'xmtp.groupMessageBroadcaster.minPayloadSize',
    'xmtp.identityUpdateBroadcaster.maxPayloadSize',
    'xmtp.identityUpdateBroadcaster.minPayloadSize',
    'xmtp.appChainGateway.migrator',
    'xmtp.appChainParameterRegistry.migrator',
    'xmtp.factory.migrator',
    'xmtp.groupMessageBroadcaster.migrator',
    'xmtp.identityUpdateBroadcaster.migrator',
];

const KEY_HASHES = [
    '0xe3e03926054dd73a048f267b9d4a853d4aa65ddb7a9124f62fa2d6ede92b3640',
    '0xf5fbe60ae44d6098fc3c79aef6d489ef47144adcc9f49f098e47b80059019133',
    '0x2c336ee0d4be95c5f00f1ff21f615ea92a3a387ad951bf3fc57ac897c74482a3',
    '0x242be7d88f3f9edfbcd7b231cc83b828721735220f1434664d7a71fe1652cb2a',
    '0x55e0db79f7139be3b5d7d9f6e5f6bdd73e0cdbaea60f0bbe5575cdb09247028f',
    '0xad5cdbf9e0e57bfca40163fbf037391e27fcb32c60f4834bcd1ec24d736e8494',
    '0xf6c147048b475f565daa57161570ab460825ee4363386d6c547a8d0e6668fb30',
    '0x0b3ecf4181044e9e3a3544f833914e6f2ea0cef792d88ea0f108f3072c15b03c',
    '0x26a1dc1a8112743c60492dcbf6199afcbd73b66d2592d06488900c96cff90622',
    '0x331fa9df4a3417659f3c2d9dc0d479a4016c0e09b6de4a7546d6ed463df01205',
    '0xd6f358750662d72d2fe409b9e04ef835c211426506901649e93907fd752dafa0',
    '0x3ba377e4c358489b6f86284308f8ea129086cf69bd0139708477a1bc2df6f1ff',
    '0xab84f206ec0b223276553f661ed29979b630ceae43567b7f008041d68049a6be',
];

export function handleIndexParameterSet(event: IndexedParameterSetEvent): void {
    for (let i = 0; i < KEY_HASHES.length; i++) {
        if (!event.params.key.equals(Bytes.fromHexString(KEY_HASHES[i]))) continue;

        handleParameter(event.address, KEYS[i], event.params.value, event.block.timestamp.toI32());
    }

    throw new Error(`Unknown parameter key: ${event.params.key.toHexString()}`);
}

export function handleParameterSet(event: ParameterSetEvent): void {
    handleParameter(event.address, event.params.key, event.params.value, event.block.timestamp.toI32());
}

function handleParameter(appChainParameterRegistryAddress: Address, key: string, value: Bytes, timestamp: i32): void {
    const registry = getAppChainParameterRegistry(appChainParameterRegistryAddress);

    registry.lastUpdate = timestamp;
    registry.save();

    const parameter = getParameter(key);

    parameter.value = value.toHexString();
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
