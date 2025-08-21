import { Address, Bytes, dataSource } from '@graphprotocol/graph-ts';

import {
    Parameter,
    ParameterRegistryImplementationSnapshot,
    ParameterValueSnapshot,
    SettlementChainParameterRegistry,
} from '../generated/schema';

import {
    ParameterSet as ParameterSetEvent,
    ParameterSet1 as IndexedParameterSetEvent,
    Upgraded as UpgradedEvent,
} from '../generated/SettlementChainParameterRegistry/SettlementChainParameterRegistry';

const STARTING_IMPLEMENTATION = dataSource.context().getString('startingImplementation');

/* ============ Handlers ============ */

// NOTE: Do not sort this array, as it aligns with the key hashes array.
const KEYS = [
    'xmtp.appChainGateway.migrator',
    'xmtp.appChainGateway.paused',
    'xmtp.appChainParameterRegistry.isAdmin.0xb64d5bf62f30512bd130c0d7c80db7ac1e6801a3',
    'xmtp.appChainParameterRegistry.migrator',
    'xmtp.distributionManager.migrator',
    'xmtp.distributionManager.paused',
    'xmtp.distributionManager.protocolFeesRecipient',
    'xmtp.factory.migrator',
    'xmtp.factory.paused',
    'xmtp.feeToken.migrator',
    'xmtp.groupMessageBroadcaster.maxPayloadSize',
    'xmtp.groupMessageBroadcaster.migrator',
    'xmtp.groupMessageBroadcaster.minPayloadSize',
    'xmtp.groupMessageBroadcaster.paused',
    'xmtp.groupMessageBroadcaster.payloadBootstrapper',
    'xmtp.identityUpdateBroadcaster.maxPayloadSize',
    'xmtp.identityUpdateBroadcaster.migrator',
    'xmtp.identityUpdateBroadcaster.minPayloadSize',
    'xmtp.identityUpdateBroadcaster.paused',
    'xmtp.identityUpdateBroadcaster.payloadBootstrapper',
    'xmtp.mockUnderlyingFeeToken.migrator',
    'xmtp.nodeRegistry.admin',
    'xmtp.nodeRegistry.maxCanonicalNodes',
    'xmtp.nodeRegistry.migrator',
    'xmtp.payerRegistry.feeDistributor',
    'xmtp.payerRegistry.migrator',
    'xmtp.payerRegistry.minimumDeposit',
    'xmtp.payerRegistry.paused',
    'xmtp.payerRegistry.settler',
    'xmtp.payerRegistry.withdrawLockPeriod',
    'xmtp.payerReportManager.migrator',
    'xmtp.payerReportManager.protocolFeeRate',
    'xmtp.rateRegistry.congestionFee',
    'xmtp.rateRegistry.messageFee',
    'xmtp.rateRegistry.migrator',
    'xmtp.rateRegistry.storageFee',
    'xmtp.rateRegistry.targetRatePerMinute',
    'xmtp.settlementChainGateway.inbox.351243127',
    'xmtp.settlementChainGateway.migrator',
    'xmtp.settlementChainGateway.paused',
    'xmtp.settlementChainParameterRegistry.isAdmin.0x560469cbb7d1e29c7d56efe765b21fbbac639dc7',
    'xmtp.settlementChainParameterRegistry.migrator',
];

// NOTE: Do not sort this array, as it aligns with the keys array.
const KEY_HASHES = [
    '0x26a1dc1a8112743c60492dcbf6199afcbd73b66d2592d06488900c96cff90622', // xmtp.appChainGateway.migrator
    '0xb9ed243799fbfe476c67b29f1c2f687714ae2c696ca00bbc123a0dace2d18478', // xmtp.appChainGateway.paused
    '0x8275f5f15ef0ce0a2fda70a6d150c115c89f34efd71a45726210531806a0e08b', // xmtp.appChainParameterRegistry.isAdmin.0xb64d5bf62f30512bd130c0d7c80db7ac1e6801a3
    '0x331fa9df4a3417659f3c2d9dc0d479a4016c0e09b6de4a7546d6ed463df01205', // xmtp.appChainParameterRegistry.migrator
    '0xe084a65cdca8f5c28722abe348b294e68a10ca011cb7a14a4445ea362f029a1b', // xmtp.distributionManager.migrator
    '0x699e0b274aba8a56f1c3b514a27588ed85889f8ca8029154295f9e9a654ed83f', // xmtp.distributionManager.paused
    '0x14e5db37b0e2ea21d8e168d85c30d7abcbedaeaec6e35aeab201b08000b3c37a', // xmtp.distributionManager.protocolFeesRecipient
    '0xd6f358750662d72d2fe409b9e04ef835c211426506901649e93907fd752dafa0', // xmtp.factory.migrator
    '0x1a894c95cb8b423bb7eab764d5bd24e517313e318911fa2e66c8e2da03adc4a5', // xmtp.factory.paused
    '0xf2a3ef096470641e927ccf32a59adebedccb3ea5ef9603faccff5a94e356da8c', // xmtp.feeToken.migrator
    '0x55e0db79f7139be3b5d7d9f6e5f6bdd73e0cdbaea60f0bbe5575cdb09247028f', // xmtp.groupMessageBroadcaster.maxPayloadSize
    '0x3ba377e4c358489b6f86284308f8ea129086cf69bd0139708477a1bc2df6f1ff', // xmtp.groupMessageBroadcaster.migrator
    '0xad5cdbf9e0e57bfca40163fbf037391e27fcb32c60f4834bcd1ec24d736e8494', // xmtp.groupMessageBroadcaster.minPayloadSize
    '0xe3e03926054dd73a048f267b9d4a853d4aa65ddb7a9124f62fa2d6ede92b3640', // xmtp.groupMessageBroadcaster.paused
    '0x2c336ee0d4be95c5f00f1ff21f615ea92a3a387ad951bf3fc57ac897c74482a3', // xmtp.groupMessageBroadcaster.payloadBootstrapper
    '0xf6c147048b475f565daa57161570ab460825ee4363386d6c547a8d0e6668fb30', // xmtp.identityUpdateBroadcaster.maxPayloadSize
    '0xab84f206ec0b223276553f661ed29979b630ceae43567b7f008041d68049a6be', // xmtp.identityUpdateBroadcaster.migrator
    '0x0b3ecf4181044e9e3a3544f833914e6f2ea0cef792d88ea0f108f3072c15b03c', // xmtp.identityUpdateBroadcaster.minPayloadSize
    '0xf5fbe60ae44d6098fc3c79aef6d489ef47144adcc9f49f098e47b80059019133', // xmtp.identityUpdateBroadcaster.paused
    '0x242be7d88f3f9edfbcd7b231cc83b828721735220f1434664d7a71fe1652cb2a', // xmtp.identityUpdateBroadcaster.payloadBootstrapper
    '0xdd047f29157d02fab06422578e8fbb1531e915dd4517f355cfe754217b8d88cd', // xmtp.mockUnderlyingFeeToken.migrator
    '0x9d4812501814b02abc8a83018de2e68c5dea7dad4d3ad0a498f10539a9b84409', // xmtp.nodeRegistry.admin
    '0x6969653767ae49269d69842cb34f6e2b3329e88d9c8fa50a48a2fde3d10ea930', // xmtp.nodeRegistry.maxCanonicalNodes
    '0x880e459f95944ca08a3f708eabe295db75c673a948604ab81191c635c0ad5fc0', // xmtp.nodeRegistry.migrator
    '0x8e0db857cb76a8ec80a5e1ea60b2fd0bafb6bf62d1b1a1b61fc3de9b0adf3cf2', // xmtp.payerRegistry.feeDistributor
    '0xe3f11a86de73e39d97c0596e78a28dc663248def4a082dfb1ea06044ccc38963', // xmtp.payerRegistry.migrator
    '0x60c6a94ffbfe704245192f92dcb0fa374eb74479fd50944c820ffa091825a36e', // xmtp.payerRegistry.minimumDeposit
    '0xcea2a8b32987dc3aabd60165066dbe01c7f5f6da0d54adef4b73d13d8fb563ef', // xmtp.payerRegistry.paused
    '0x6d4fbacb90376ee476b3bcd55c4d149de093b9e2a7d6635ec850833af7a5efb4', // xmtp.payerRegistry.settler
    '0xb512e68949b6d016128c56b3a131ccbec84a16f8640ca5b418aac0de0a18b433', // xmtp.payerRegistry.withdrawLockPeriod
    '0x95b2712fd9cb4b27a2e65c88ae6261d7b9de3949af48235780b61992af1e6513', // xmtp.payerReportManager.migrator
    '0x0d748756696b7247a5de5daf867916765822ff9923a2f38a2a7afb88515b0b71', // xmtp.payerReportManager.protocolFeeRate
    '0x7773b668913a27702e1502e78fd6785804cfd19da68c493948eb96a2730861f6', // xmtp.rateRegistry.congestionFee
    '0x0f4c8a2110d7ee42f85ccecbf5c10dc500336aef2f5d353646935d571f38bcb8', // xmtp.rateRegistry.messageFee
    '0x6178ae838d144e6fa660e211b6f3ea4931dbc45a3024d997164d9ff55b046a6c', // xmtp.rateRegistry.migrator
    '0x55ffc15c62fceca691e5778fec749b880c7bde7e52aba0594653c5a114b4c138', // xmtp.rateRegistry.storageFee
    '0x2ae54ce74c39d7ce0d99020a80bd71ee01a62099c3ecbf9a8c3305d9b5f214c0', // xmtp.rateRegistry.targetRatePerMinute
    '0x9e2c5a8a06be8ec045e6002ec9da4e9ef638e645064dec62b2a9cf49788f3ced', // xmtp.settlementChainGateway.inbox.351243127
    '0xe4dd456b848f6ac060bc0158d27194adc7596fa0955000a1fad77aab37f3e3cf', // xmtp.settlementChainGateway.migrator
    '0x91de067d6ba45c497567f1730cebdf7c97c763d8d0cba8fd45527e4b257e0407', // xmtp.settlementChainGateway.paused
    '0xfe1a9108720564e1512aee418700713b9fb61b4872917ebe6755197b1381b764', // xmtp.settlementChainParameterRegistry.isAdmin.0x560469cbb7d1e29c7d56efe765b21fbbac639dc7
    '0xbbfd3d411938db0941538d5ee925764ce216654e79545dc92762be683f89d65d', // xmtp.settlementChainParameterRegistry.migrator
];

export function handleIndexParameterSet(event: IndexedParameterSetEvent): void {
    const timestamp = event.block.timestamp.toI32();

    for (let i = 0; i < KEY_HASHES.length; i++) {
        if (!event.params.key.equals(Bytes.fromHexString(KEY_HASHES[i]))) continue;

        return handleParameter(event.address, KEYS[i], event.params.value, timestamp);
    }

    throw new Error(`Unknown parameter key: ${event.params.key.toHexString()}`);
}

export function handleParameterSet(event: ParameterSetEvent): void {
    handleParameter(event.address, event.params.key, event.params.value, event.block.timestamp.toI32());
}

function handleParameter(parameterRegistryAddress: Address, key: string, value: Bytes, timestamp: i32): void {
    const registry = getSettlementChainParameterRegistry(parameterRegistryAddress);

    registry.lastUpdate = timestamp;
    registry.save();

    const parameter = getParameter(key);

    parameter.value = value.toHexString();
    updateParameterValueSnapshot(parameter, timestamp, parameter.value);

    parameter.lastUpdate = timestamp;
    parameter.save();
}

export function handleUpgraded(event: UpgradedEvent): void {
    const registry = getSettlementChainParameterRegistry(event.address);
    const timestamp = event.block.timestamp.toI32();

    registry.implementation = event.params.implementation.toHexString();
    updateImplementationSnapshot(timestamp, registry.implementation);

    registry.lastUpdate = timestamp;
    registry.save();
}

/* ============ Entity Helpers ============ */

export function getSettlementChainParameterRegistry(address: Address): SettlementChainParameterRegistry {
    const id = `SettlementChainParameterRegistry-${address.toHexString()}`;

    let registry = SettlementChainParameterRegistry.load(id);

    if (registry) return registry;

    registry = new SettlementChainParameterRegistry(id);

    registry.lastUpdate = 0;
    registry.address = address.toHexString();
    registry.implementation = STARTING_IMPLEMENTATION;

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

    return parameter;
}

/* ============ Snapshot Helpers ============ */

function updateImplementationSnapshot(timestamp: i32, value: string): void {
    const id = `ParameterRegistryImplementationSnapshot-${timestamp.toString()}`;

    let snapshot = ParameterRegistryImplementationSnapshot.load(id);

    if (!snapshot) {
        snapshot = new ParameterRegistryImplementationSnapshot(id);

        snapshot.timestamp = timestamp;
    }

    snapshot.value = value;

    snapshot.save();
}

function updateParameterValueSnapshot(parameter: Parameter, timestamp: i32, value: string): void {
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
