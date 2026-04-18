import {
  encodeAbiParameters,
  keccak256,
  stringToHex,
  type Hex,
} from "viem";
import {
  REQUEST_FORMAT_V1,
  RESPONSE_FORMAT_V1,
} from "./marketplaceAbi";

function hashPayloadV1(formatByte: number, utf8Text: string): Hex {
  const inner = keccak256(stringToHex(utf8Text));
  return keccak256(
    encodeAbiParameters(
      [{ type: "uint8" }, { type: "bytes32" }],
      [formatByte, inner],
    ),
  );
}

/** 与 `REQUEST_FORMAT_V1` 对齐； preimage：utf8(prompt) → inner hash → abi.encode(uint8,bytes32) → keccak256 */
export function requestHashV1(prompt: string): Hex {
  return hashPayloadV1(REQUEST_FORMAT_V1, prompt);
}

/** 与 `RESPONSE_FORMAT_V1` 对齐； preimage：utf8(assistant text) */
export function responseHashV1(responseText: string): Hex {
  return hashPayloadV1(RESPONSE_FORMAT_V1, responseText);
}
