import { describe, expect, it } from "vitest";
import { requestHashV1, responseHashV1 } from "./hashMvp";

describe("hashMvp format v1", () => {
  it("requestHashV1('hello') matches golden vector", () => {
    expect(requestHashV1("hello")).toBe(
      "0xa6d7ea339f9bff78ade26257f908d59998e6ab137f88a92f0a23fea5317aa992",
    );
  });

  it("responseHashV1('world') matches golden vector", () => {
    expect(responseHashV1("world")).toBe(
      "0x0d05181dc0a26816b8d997eaa6e9cfe05fded5ce660ace2a435d8de0e041f109",
    );
  });

  it("empty string is stable", () => {
    expect(requestHashV1("")).toBe(
      "0x35ed5c6b6645257abacfc239a9fed3fc7c936ba7a6e3ff7b5e51faf59a2c55cd",
    );
  });
});
