export const CONTRACT_ADDRESS = '0x7fc1EB41EFBd7BaF2702c03df7b67aA979711fe6';

export const CONTRACT_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'AlreadyJoined',
    type: 'error',
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'NotJoined',
    type: 'error',
  },
  { inputs: [], name: 'ZamaProtocolUnsupported', type: 'error' },
  {
    inputs: [],
    name: 'INITIAL_GOLD',
    outputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'SOLDIER_1_COST',
    outputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'SOLDIER_2_COST',
    outputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'SOLDIER_3_COST',
    outputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'SOLDIER_4_COST',
    outputs: [{ internalType: 'uint64', name: '', type: 'uint64' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'externalEuint8', name: 'encryptedSoldierType', type: 'bytes32' },
      { internalType: 'bytes', name: 'inputProof', type: 'bytes' },
    ],
    name: 'buildSoldier',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'confidentialProtocolId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'getEncryptedBuiltSoldierType',
    outputs: [{ internalType: 'euint8', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'getEncryptedGold',
    outputs: [{ internalType: 'euint64', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'hasJoined',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  { inputs: [], name: 'join', outputs: [], stateMutability: 'nonpayable', type: 'function' },
] as const;

export const SOLDIERS = [
  { type: 1, name: 'Scout', cost: 100 },
  { type: 2, name: 'Guard', cost: 200 },
  { type: 3, name: 'Knight', cost: 400 },
  { type: 4, name: 'Commander', cost: 1000 },
] as const;
