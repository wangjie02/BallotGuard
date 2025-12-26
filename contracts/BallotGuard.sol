// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, euint32, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title BallotGuard - Encrypted survey for digital asset habits
/// @notice Collects encrypted responses and tallies option counts homomorphically.
/// @dev Counts are kept encrypted; callers can request a single question to be made publicly decryptable.
contract BallotGuard is ZamaEthereumConfig {
    uint8 public constant QUESTION_COUNT = 5;
    uint8 public constant MAX_OPTIONS = 4;

    uint8[QUESTION_COUNT] public optionsPerQuestion;
    euint32[MAX_OPTIONS][QUESTION_COUNT] private _encryptedCounts;
    mapping(address => bool) public hasResponded;

    event ResponsesSubmitted(address indexed respondent);
    event QuestionResultsUnlocked(uint256 indexed questionId, uint8 optionCount);

    error InvalidQuestion(uint256 questionId);
    error InvalidOption(uint256 questionId, uint256 optionId);
    error InvalidOptionConfiguration(uint256 questionId, uint8 optionCount);
    error AlreadyParticipated(address participant);

    constructor(uint8[QUESTION_COUNT] memory optionCounts) {
        for (uint256 i = 0; i < QUESTION_COUNT; i++) {
            uint8 optionCount = optionCounts[i];
            if (optionCount < 2 || optionCount > MAX_OPTIONS) {
                revert InvalidOptionConfiguration(i, optionCount);
            }
            optionsPerQuestion[i] = optionCount;
        }
    }

    /// @notice Submit encrypted choices for all questions.
    /// @param encryptedChoices Encrypted answer per question (0-indexed options).
    /// @param inputProof Proof returned by the relayer encrypt() call.
    function submitResponses(
        externalEuint8[QUESTION_COUNT] calldata encryptedChoices,
        bytes calldata inputProof
    ) external {
        if (hasResponded[msg.sender]) {
            revert AlreadyParticipated(msg.sender);
        }

        for (uint256 i = 0; i < QUESTION_COUNT; i++) {
            _applyChoice(i, FHE.fromExternal(encryptedChoices[i], inputProof));
        }

        hasResponded[msg.sender] = true;
        emit ResponsesSubmitted(msg.sender);
    }

    /// @notice Request a question's tallies to be publicly decryptable.
    /// @param questionId Question index to unlock.
    function requestQuestionResults(uint256 questionId) external {
        _ensureValidQuestion(questionId);
        uint8 optionCount = optionsPerQuestion[questionId];

        for (uint256 i = 0; i < optionCount; i++) {
            euint32 publicCount = FHE.makePubliclyDecryptable(_encryptedCounts[questionId][i]);
            _encryptedCounts[questionId][i] = publicCount;
            FHE.allow(publicCount, msg.sender);
            FHE.allowThis(publicCount);
        }

        emit QuestionResultsUnlocked(questionId, optionCount);
    }

    /// @notice Get the encrypted count for a specific option.
    function getEncryptedCount(uint256 questionId, uint256 optionId) external view returns (euint32) {
        _ensureValidOption(questionId, optionId);
        return _encryptedCounts[questionId][optionId];
    }

    /// @notice Get all encrypted counts for a question (unused slots are zeroed).
    function getEncryptedCounts(uint256 questionId) external view returns (euint32[MAX_OPTIONS] memory counts) {
        _ensureValidQuestion(questionId);
        for (uint256 i = 0; i < MAX_OPTIONS; i++) {
            counts[i] = _encryptedCounts[questionId][i];
        }
    }

    function _applyChoice(uint256 questionId, euint8 choice) internal {
        uint8 optionCount = optionsPerQuestion[questionId];
        for (uint8 optionId = 0; optionId < optionCount; optionId++) {
            ebool matches = FHE.eq(choice, FHE.asEuint8(optionId));
            _encryptedCounts[questionId][optionId] = _bumpCount(_encryptedCounts[questionId][optionId], matches);
        }
    }

    function _bumpCount(euint32 storedCount, ebool shouldIncrement) private returns (euint32) {
        euint32 incremented = FHE.add(storedCount, FHE.asEuint32(1));
        euint32 updated = FHE.select(shouldIncrement, incremented, storedCount);
        FHE.allowThis(updated);
        return updated;
    }

    function _ensureValidQuestion(uint256 questionId) private pure {
        if (questionId >= QUESTION_COUNT) {
            revert InvalidQuestion(questionId);
        }
    }

    function _ensureValidOption(uint256 questionId, uint256 optionId) private view {
        _ensureValidQuestion(questionId);
        if (optionId >= optionsPerQuestion[questionId]) {
            revert InvalidOption(questionId, optionId);
        }
    }
}
