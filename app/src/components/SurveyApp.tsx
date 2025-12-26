import { useEffect, useMemo, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Contract } from 'ethers';
import { isAddress, zeroAddress } from 'viem';
import { useAccount, usePublicClient, useReadContract } from 'wagmi';
import { CONTRACT_ABI, CONTRACT_ADDRESS, QUESTIONS, OPTION_COUNTS } from '../config/contracts';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { QuestionCard } from './QuestionCard';
import '../styles/SurveyApp.css';

type DecryptedResults = Record<number, { counts: number[]; timestamp: number }>;

export function SurveyApp() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [contractAddress, setContractAddress] = useState(CONTRACT_ADDRESS);
  const [answers, setAnswers] = useState<(number | null)[]>(() => QUESTIONS.map(() => null));
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedResultsQuestion, setSelectedResultsQuestion] = useState(0);
  const [isRequestingResults, setIsRequestingResults] = useState(false);
  const [results, setResults] = useState<DecryptedResults>({});
  const [resultsMessage, setResultsMessage] = useState<string | null>(null);

  const validContract = useMemo(
    () => isAddress(contractAddress) && contractAddress !== zeroAddress,
    [contractAddress],
  );

  const { data: hasSubmitted } = useReadContract({
    address: validContract ? (contractAddress as `0x${string}`) : undefined,
    abi: CONTRACT_ABI,
    functionName: 'hasResponded',
    args: validContract && address ? [address] : undefined,
    query: {
      enabled: Boolean(validContract && address),
    },
  });

  useEffect(() => {
    setStatusMessage(null);
  }, [contractAddress]);

  useEffect(() => {
    const mismatched = QUESTIONS.some((question, idx) => question.options.length !== OPTION_COUNTS[idx]);
    if (mismatched) {
      setStatusMessage('Question configuration does not match contract option counts.');
    }
  }, []);

  const updateAnswer = (questionId: number, optionIndex: number) => {
    setAnswers((prev) => prev.map((current, idx) => (idx === questionId ? optionIndex : current)));
  };

  const resetSelections = () => {
    setAnswers(QUESTIONS.map(() => null));
  };

  const missingSelections = answers.some((choice) => choice === null);

  const submitResponses = async () => {
    if (!validContract) {
      setStatusMessage('Set a deployed BallotGuard address before submitting.');
      return;
    }
    if (!address || !isConnected) {
      setStatusMessage('Connect a wallet to submit encrypted answers.');
      return;
    }
    if (!instance) {
      setStatusMessage('Zama relayer is still initializing.');
      return;
    }
    if (missingSelections) {
      setStatusMessage('Please select an option for every question.');
      return;
    }
    if (hasSubmitted) {
      setStatusMessage('You have already submitted answers for this address.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Encrypting your answers and sending the transaction...');
    try {
      const signer = await signerPromise;
      if (!signer) {
        throw new Error('No signer available from the connected wallet.');
      }

      const inputBuilder = instance.createEncryptedInput(contractAddress, address);
      answers.forEach((answer) => inputBuilder.add8(answer ?? 0));
      const encryptedInput = await inputBuilder.encrypt();

      const contract = new Contract(contractAddress, CONTRACT_ABI, signer);
      const tx = await contract.submitResponses(
        [
          encryptedInput.handles[0],
          encryptedInput.handles[1],
          encryptedInput.handles[2],
          encryptedInput.handles[3],
          encryptedInput.handles[4],
        ],
        encryptedInput.inputProof,
      );

      setStatusMessage('Waiting for confirmation...');
      await tx.wait();

      setStatusMessage('Submission recorded on-chain. Your vote is encrypted.');
      resetSelections();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit responses.';
      setStatusMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestAndDecryptResults = async () => {
    if (!validContract) {
      setResultsMessage('Set a deployed BallotGuard address before requesting results.');
      return;
    }
    if (!instance) {
      setResultsMessage('Zama relayer is not ready yet.');
      return;
    }
    if (!publicClient) {
      setResultsMessage('No viem client available to read the chain.');
      return;
    }

    setIsRequestingResults(true);
    setResultsMessage('Requesting public access and decrypting counts...');
    try {
      const signer = await signerPromise;
      if (!signer) {
        throw new Error('No signer available from the connected wallet.');
      }

      const contract = new Contract(contractAddress, CONTRACT_ABI, signer);
      const tx = await contract.requestQuestionResults(selectedResultsQuestion);
      await tx.wait();

      const optionCount = QUESTIONS[selectedResultsQuestion].options.length;
      const handles = await Promise.all(
        Array.from({ length: optionCount }, async (_, idx) => {
          const handle = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: CONTRACT_ABI,
            functionName: 'getEncryptedCount',
            args: [BigInt(selectedResultsQuestion), BigInt(idx)],
          });
          return handle as string;
        }),
      );

      const decrypted = await instance.publicDecrypt(handles);
      const clearCounts = handles.map((handle) => {
        const value = decrypted.clearValues[handle] ?? decrypted.clearValues[handle.toLowerCase()] ?? 0;
        return Number(value);
      });

      setResults((prev) => ({
        ...prev,
        [selectedResultsQuestion]: { counts: clearCounts, timestamp: Date.now() },
      }));
      setResultsMessage('Decrypted counts refreshed.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to decrypt results right now.';
      setResultsMessage(message);
    } finally {
      setIsRequestingResults(false);
    }
  };

  const currentResult = results[selectedResultsQuestion];

  return (
    <div className="survey-shell">
      <header className="survey-header">
        <div>
          <p className="eyebrow">BallotGuard · Zama FHE</p>
          <h1>Encrypted asset sentiment</h1>
          <p className="lede">
            Submit five confidential answers about how you use digital assets. Responses are tallied homomorphically,
            and anyone can unlock per-question totals without exposing individual voters.
          </p>
          <div className="contract-input">
            <label>
              Contract address (Sepolia)
              <input
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value.trim())}
                placeholder="0x..."
              />
            </label>
            {!validContract ? (
              <span className="contract-warning">Deploy BallotGuard and paste the live address to continue.</span>
            ) : null}
          </div>
        </div>
        <div className="header-actions">
          <ConnectButton />
          <div className="pill-stack">
            <span className="pill">{QUESTIONS.length} questions</span>
            <span className="pill">Encrypted writes</span>
            <span className="pill">Public decryption on request</span>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="questions-column">
          <div className="section-heading">
            <div>
              <h2>Respond securely</h2>
              <p>Select one option per question. Your choices never leave the browser unencrypted.</p>
            </div>
            <button
              type="button"
              className="ghost-button"
              onClick={resetSelections}
              disabled={isSubmitting}
            >
              Reset selections
            </button>
          </div>

          <div className="questions-grid">
            {QUESTIONS.map((question, idx) => (
              <QuestionCard
                key={question.id}
                question={question}
                selectedOption={answers[idx]}
                onSelect={(option) => updateAnswer(idx, option)}
                disabled={Boolean(hasSubmitted) || isSubmitting || !validContract}
              />
            ))}
          </div>

          <div className="action-row">
            <div className="status-chips">
              <span className={`chip ${isConnected ? 'chip-ok' : 'chip-muted'}`}>
                {isConnected ? 'Wallet connected' : 'Connect wallet'}
              </span>
              <span className={`chip ${instance && !zamaLoading ? 'chip-ok' : 'chip-muted'}`}>
                {zamaLoading ? 'Initializing Zama relayer...' : 'Relayer ready'}
              </span>
              <span className={`chip ${hasSubmitted ? 'chip-warn' : 'chip-ok'}`}>
                {hasSubmitted ? 'Already submitted' : 'Ready to submit'}
              </span>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={submitResponses}
              disabled={
                isSubmitting ||
                zamaLoading ||
                missingSelections ||
                Boolean(hasSubmitted) ||
                !instance ||
                !validContract
              }
            >
              {isSubmitting ? 'Submitting...' : 'Submit encrypted answers'}
            </button>
          </div>
          {statusMessage ? <div className="status-banner">{statusMessage}</div> : null}
          {zamaError ? <div className="status-banner warning">{zamaError}</div> : null}
        </section>

        <section className="results-column">
          <div className="section-heading">
            <div>
              <h2>Request public results</h2>
              <p>Choose a question to unlock aggregate counts, then decrypt via the Zama relayer.</p>
            </div>
            <div className="select-row">
              <label>
                Question
                <select
                  value={selectedResultsQuestion}
                  onChange={(e) => setSelectedResultsQuestion(Number(e.target.value))}
                >
                  {QUESTIONS.map((q) => (
                    <option key={q.id} value={q.id}>
                      Q{q.id + 1}: {q.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="secondary-button"
                onClick={requestAndDecryptResults}
                disabled={isRequestingResults || !validContract || zamaLoading}
              >
                {isRequestingResults ? 'Decrypting...' : 'Request results'}
              </button>
            </div>
          </div>

          <div className="results-card">
            {currentResult ? (
              <div className="bars">
                {QUESTIONS[selectedResultsQuestion].options.map((label, idx) => {
                  const count = currentResult.counts[idx] ?? 0;
                  const max = Math.max(...currentResult.counts, 1);
                  const width = Math.round((count / max) * 100);
                  return (
                    <div key={label} className="bar-row">
                      <div className="bar-label">
                        <span className="option-index">{idx + 1}</span>
                        <span>{label}</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${width}%` }} />
                      </div>
                      <span className="bar-count">{count}</span>
                    </div>
                  );
                })}
                <p className="timestamp">
                  Updated {new Date(currentResult.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ) : (
              <div className="placeholder">
                <p>Request a question to see encrypted tallies become public.</p>
                <ul>
                  <li>Send a request transaction with your wallet.</li>
                  <li>We ask the relayer to publicly decrypt the option counts.</li>
                  <li>Only aggregate totals are revealed—individual votes stay private.</li>
                </ul>
              </div>
            )}
            {resultsMessage ? <div className="status-banner subtle">{resultsMessage}</div> : null}
          </div>
        </section>
      </main>
    </div>
  );
}
