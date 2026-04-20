# Optional trust layers (Phase 5+)

The MVP implements **governance hardening**, **multi-auditor attestations**, **challengeable slashing**, and **canonical audit hashing**. Stronger cryptographic guarantees are optional and usually layered on only after the social / economic rules above are stable.

## 1. TEE-backed audit runners

**Idea:** Run `apps/audit-server` (or a subset of probes) inside a trusted execution environment and attach a **remote attestation** to each published report.

**Pros:** Stronger evidence that a specific binary produced the report.  
**Cons:** Vendor lock-in, operational complexity, attestation verification on-chain is non-trivial.

**Integration sketch:** Publish `reportUri` pointing to JSON that includes `attestation_quote` / certificate chain; verifiers check attestation before trusting the report.

## 2. Zero-knowledge proofs (narrow scopes)

**Idea:** Prove specific properties (e.g. “hash of request/response pair matches call record”) without revealing plaintext prompts.

**Pros:** Useful for selective disclosure.  
**Cons:** General “proof of correct inference” is an open research area; circuits are costly to develop and audit.

**Integration sketch:** Keep storing `requestHash` / `responseHash` on-chain; zk proves linkage to off-chain artifacts consumers agree on.

## 3. Restaking / AVS or oracle networks

**Idea:** Outsource audit execution and quorum to a decentralized operator set with economic security.

**Pros:** Scales independent auditors without manual allowlisting.  
**Cons:** Tokenomics, slashing conditions, and liveness assumptions must be designed carefully.

**Integration sketch:** AVS posts a Merkle root or signed quorum statement; marketplace stores the root or aggregated signature via a gateway contract.

## 4. What to build first

For this repository, the recommended order is:

1. Multisig-controlled `auditRecorder` + `slashTreasury`
2. Multiple independent attestations per `beginAuditRound`
3. Slash proposals tied to `reportHash` + challenge window
4. Canonical JSON + public report hosting (IPFS / HTTPS)
5. Only then evaluate TEE / zk / AVS for specific high-value claims
