import { describe, expect, it } from "vitest";
import { canonicalStringify } from "./canonicalJson.js";

describe("canonicalStringify", () => {
  it("sorts object keys at every level", () => {
    const obj = { b: 2, a: { d: 1, c: [3, { z: 9, y: 8 }] } };
    expect(canonicalStringify(obj)).toBe('{"a":{"c":[3,{"y":8,"z":9}],"d":1},"b":2}');
  });

  it("matches audit-server Python fixture shape", () => {
    const obj = { z: true, a: [1, { b: 2, a: 1 }] };
    expect(canonicalStringify(obj)).toBe('{"a":[1,{"a":1,"b":2}],"z":true}');
  });
});
