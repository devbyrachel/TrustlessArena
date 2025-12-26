import { useMemo, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Contract } from 'ethers';

import { Header } from './Header';
import { CONTRACT_ABI, CONTRACT_ADDRESS, SOLDIERS } from '../config/contracts';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import '../styles/ArenaApp.css';

type DecryptResult = {
  soldierType?: number;
  gold?: number;
};

type SoldierType = (typeof SOLDIERS)[number]['type'];

export function ArenaApp() {
  const { address, isConnected } = useAccount();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();
  const signerPromise = useEthersSigner();

  const [contractAddressInput, setContractAddressInput] = useState<string>(CONTRACT_ADDRESS);
  const [selectedSoldierType, setSelectedSoldierType] = useState<SoldierType>(1);
  const [isWriting, setIsWriting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [decrypting, setDecrypting] = useState(false);
  const [decrypted, setDecrypted] = useState<DecryptResult>({});

  const soldierByType = useMemo(() => new Map(SOLDIERS.map((s) => [s.type, s])), []);
  const selectedSoldier = soldierByType.get(selectedSoldierType);

  const isValidContractAddress = /^0x[0-9a-fA-F]{40}$/.test(contractAddressInput);

  const joinedQuery = useReadContract({
    address: contractAddressInput as any,
    abi: CONTRACT_ABI,
    functionName: 'hasJoined',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isValidContractAddress },
  });

  const goldQuery = useReadContract({
    address: contractAddressInput as any,
    abi: CONTRACT_ABI,
    functionName: 'getEncryptedGold',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isValidContractAddress },
  });

  const soldierQuery = useReadContract({
    address: contractAddressInput as any,
    abi: CONTRACT_ABI,
    functionName: 'getEncryptedBuiltSoldierType',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isValidContractAddress },
  });

  const joined = joinedQuery.data === true;

  const writeContract = async (fn: (contract: Contract) => Promise<any>) => {
    if (!isValidContractAddress) throw new Error('Set a valid contract address first');
    if (!signerPromise) throw new Error('Wallet not connected');
    const signer = await signerPromise;
    const contract = new Contract(contractAddressInput, CONTRACT_ABI, signer);
    return fn(contract);
  };

  const onJoin = async () => {
    if (!address) return;
    setStatusMessage('');
    setIsWriting(true);
    try {
      const tx = await writeContract((c) => c.join());
      setStatusMessage(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      await joinedQuery.refetch();
      await goldQuery.refetch();
      await soldierQuery.refetch();
      setStatusMessage('Joined. You received 1000 encrypted gold.');
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Join failed');
    } finally {
      setIsWriting(false);
    }
  };

  const onBuild = async () => {
    if (!address) return;
    if (!instance) {
      setStatusMessage('Encryption service not ready');
      return;
    }
    if (!isValidContractAddress) {
      setStatusMessage('Set a valid contract address first');
      return;
    }
    if (!selectedSoldier) return;

    setStatusMessage('');
    setIsWriting(true);
    try {
      const input = instance.createEncryptedInput(contractAddressInput, address);
      input.add8(selectedSoldier.type);
      const encryptedInput = await input.encrypt();

      const tx = await writeContract((c) => c.buildSoldier(encryptedInput.handles[0], encryptedInput.inputProof));
      setStatusMessage(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      await goldQuery.refetch();
      await soldierQuery.refetch();
      setStatusMessage(`Build requested for ${selectedSoldier.name}.`);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Build failed');
    } finally {
      setIsWriting(false);
    }
  };

  const userDecryptOne = async (ciphertextHandle: string) => {
    if (!instance || !address || !signerPromise) {
      throw new Error('Missing wallet or encryption service');
    }
    if (!isValidContractAddress) {
      throw new Error('Set a valid contract address first');
    }
    const signer = await signerPromise;

    const keypair = instance.generateKeypair();
    const handleContractPairs = [{ handle: ciphertextHandle, contractAddress: contractAddressInput }];
    const startTimeStamp = Math.floor(Date.now() / 1000).toString();
    const durationDays = '10';
    const contractAddresses = [contractAddressInput];
    const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);

    const signature = await signer.signTypedData(
      eip712.domain,
      { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
      eip712.message,
    );

    const result = await instance.userDecrypt(
      handleContractPairs,
      keypair.privateKey,
      keypair.publicKey,
      signature.replace('0x', ''),
      contractAddresses,
      address,
      startTimeStamp,
      durationDays,
    );

    return result[ciphertextHandle] as bigint | number | string | undefined;
  };

  const onDecryptSoldier = async () => {
    setStatusMessage('');
    setDecrypting(true);
    try {
      const { data } = await soldierQuery.refetch();
      const handle = (data ?? soldierQuery.data) as string | undefined;
      if (!handle || handle === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        setStatusMessage('No encrypted soldier found yet.');
        return;
      }
      const clear = await userDecryptOne(handle);
      const soldierType = typeof clear === 'bigint' ? Number(clear) : Number(clear);
      setDecrypted((prev) => ({ ...prev, soldierType }));
      setStatusMessage('Decrypted soldier type successfully.');
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Decryption failed');
    } finally {
      setDecrypting(false);
    }
  };

  const onDecryptGold = async () => {
    setStatusMessage('');
    setDecrypting(true);
    try {
      const { data } = await goldQuery.refetch();
      const handle = (data ?? goldQuery.data) as string | undefined;
      if (!handle || handle === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        setStatusMessage('No encrypted gold found yet.');
        return;
      }
      const clear = await userDecryptOne(handle);
      const gold = typeof clear === 'bigint' ? Number(clear) : Number(clear);
      setDecrypted((prev) => ({ ...prev, gold }));
      setStatusMessage('Decrypted gold successfully.');
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Decryption failed');
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div className="arena-app">
      <Header />

      <main className="arena-main">
        {!isConnected && (
          <section className="card">
            <h2 className="card-title">Connect your wallet</h2>
            <p className="card-subtitle">This game runs on Sepolia and uses encrypted game state.</p>
          </section>
        )}

        {isConnected && (
          <>
            <section className="card">
              <h2 className="card-title">Contract</h2>
              <p className="card-subtitle">Paste your deployed TrustlessArena address on Sepolia.</p>

              <div className="actions">
                <input
                  className="input"
                  value={contractAddressInput}
                  onChange={(e) => {
                    setContractAddressInput(e.target.value.trim());
                    setDecrypted({});
                    setStatusMessage('');
                  }}
                  placeholder="0x..."
                  spellCheck={false}
                />
                <span className={`muted ${isValidContractAddress ? 'ok' : ''}`}>
                  {isValidContractAddress ? 'Valid address' : 'Invalid address'}
                </span>
              </div>
            </section>

            <section className="card">
              <div className="row">
                <div>
                  <h2 className="card-title">Player</h2>
                  <p className="muted">{address}</p>
                </div>
                <div className="pill">{joined ? 'Joined' : 'Not joined'}</div>
              </div>

              <div className="actions">
                <button className="btn" onClick={onJoin} disabled={isWriting || joined || !isValidContractAddress}>
                  {joined ? 'Joined' : 'Join (get 1000 gold)'}
                </button>
              </div>

              {(zamaError || statusMessage) && (
                <div className="notice">
                  {zamaError ? <span>Encryption service error: {zamaError}</span> : <span>{statusMessage}</span>}
                </div>
              )}
            </section>

            <section className="card">
              <h2 className="card-title">Build a soldier (encrypted)</h2>
              <p className="card-subtitle">
                Your soldier choice is encrypted. The contract charges encrypted gold based on the encrypted type.
              </p>

              <div className="soldier-grid">
                {SOLDIERS.map((s) => (
                  <button
                    key={s.type}
                    type="button"
                    className={`soldier ${selectedSoldierType === s.type ? 'selected' : ''}`}
                    onClick={() => setSelectedSoldierType(s.type)}
                    disabled={isWriting}
                  >
                    <div className="soldier-name">{s.name}</div>
                    <div className="soldier-meta">
                      <span>Type {s.type}</span>
                      <span>Cost {s.cost}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="actions">
                <button
                  className="btn primary"
                  onClick={onBuild}
                  disabled={!joined || isWriting || zamaLoading || !isValidContractAddress}
                >
                  Build {selectedSoldier?.name ?? 'Soldier'}
                </button>
                <span className="muted">
                  {zamaLoading ? 'Initializing encryption…' : ' '}
                </span>
              </div>
            </section>

            <section className="card">
              <h2 className="card-title">Decrypt</h2>
              <p className="card-subtitle">Decryption happens client-side via the Relayer (requires wallet signature).</p>

              <div className="actions">
                <button
                  className="btn"
                  onClick={onDecryptSoldier}
                  disabled={!joined || decrypting || zamaLoading || !isValidContractAddress}
                >
                  Decrypt built soldier type
                </button>
                <button
                  className="btn"
                  onClick={onDecryptGold}
                  disabled={!joined || decrypting || zamaLoading || !isValidContractAddress}
                >
                  Decrypt gold
                </button>
              </div>

              <div className="result-grid">
                <div className="result">
                  <div className="result-label">Built soldier type</div>
                  <div className="result-value">{decrypted.soldierType ?? '—'}</div>
                </div>
                <div className="result">
                  <div className="result-label">Gold</div>
                  <div className="result-value">{decrypted.gold ?? '—'}</div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
