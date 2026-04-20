# Audit governance (phased decentralization)

This document summarizes how **roles**, **audit anchoring**, and **slashing** work after the decentralization roadmap implementation.

## Roles

| Role | Responsibility |
|------|----------------|
| `slashOperator` | Creates **slash proposals** (`proposeSlash`). Does not receive slashed ETH by default. |
| `slashTreasury` | Receives slashed ETH (`setSlashTreasury`, configurable by `slashOperator`). Point this at a multisig / DAO treasury. |
| `auditRecorder` | Legacy single-recorder `recordAudit` / `recordAuditWithUri`, opens audit rounds (`beginAuditRound`), and manages the auditor allowlist (`setAuditor`). |

Both `slashOperator` and `auditRecorder` use **two-step address rotation** so a multisig can accept ownership safely:

- `proposeSlashOperator` → `acceptSlashOperator`
- `proposeAuditRecorder` → `acceptAuditRecorder`

Cancellations: `cancelSlashOperatorProposal`, `cancelAuditRecorderProposal`.

## Multi-auditor attestations

1. `auditRecorder` calls `beginAuditRound(providerId)` → emits `AuditRoundStarted` and sets `activeAuditRound[providerId]`.
2. Each allowlisted auditor calls `attestAudit(providerId, roundId, reportHash, riskLevel, reportUri)` once per round.
3. Off-chain, indexers / clients aggregate attestations (quorum rules are not enforced on-chain in the MVP).

## Slash proposals (challenge window)

1. `slashOperator` calls `proposeSlash(providerId, amount, reasonHash, relatedAuditRound, reportHash)`.
2. During `slashChallengePeriodBlocks`, the **provider owner** may call `challengeSlashProposal(proposalId)` to block execution.
3. After the challenge window, anyone can call `finalizeSlashProposal(proposalId)` if the proposal was not challenged. ETH is sent to `slashTreasury`.

## Operational checklist

1. Deploy the marketplace with `priceDelayBlocks` and `slashChallengePeriodBlocks` appropriate for your chain.
2. Set `slashTreasury` to a multisig (not an individual EOA).
3. Rotate `auditRecorder` to the multisig or committee that will run `beginAuditRound` / `setAuditor`.
4. Run independent `audit-server` instances against a **relay URL you do not control** when possible (`AUDIT_RELAY_BASE_URL`).
5. Prefer publishing full canonical JSON off-chain (IPFS, HTTPS) and anchoring `reportHash` + optional `reportUri` on-chain.

See also [TRUST_LAYERS.md](./TRUST_LAYERS.md).
