import { describe, expect, it, vi } from "vitest";

import {
  DOMAIN_TXT_HOST_PREFIX,
  DOMAIN_TXT_VALUE_PREFIX,
  buildDomainChallenge,
  verifyDomainTxtRecord
} from "./domain-verification.js";

const sampleRecord = {
  org_id: "org-1",
  token: "abcdef123456",
  status: "pending" as const,
  verified_at: null
};

describe("domain verification utilities", () => {
  it("builds a challenge payload", () => {
    const payload = buildDomainChallenge("example.com", sampleRecord);

    expect(payload).toEqual({
      status: "pending",
      hostname: `${DOMAIN_TXT_HOST_PREFIX}.example.com`,
      record: `${DOMAIN_TXT_VALUE_PREFIX}${sampleRecord.token}`,
      token: sampleRecord.token,
      verified_at: null
    });
  });

  it("verifies the TXT record when resolver contains expected value", async () => {
    const resolver = vi.fn().mockResolvedValue([
      ["some other value"],
      ["  "],
      [`${DOMAIN_TXT_VALUE_PREFIX}${sampleRecord.token}`]
    ]);

    await expect(verifyDomainTxtRecord("example.com", sampleRecord.token, resolver)).resolves.toBe(true);
    expect(resolver).toHaveBeenCalledWith(`${DOMAIN_TXT_HOST_PREFIX}.example.com`);
  });

  it("returns false when resolver throws", async () => {
    const resolver = vi.fn().mockRejectedValue(new Error("lookup failed"));

    await expect(verifyDomainTxtRecord("example.com", sampleRecord.token, resolver)).resolves.toBe(false);
  });

  it("returns false when TXT record is missing", async () => {
    const resolver = vi.fn().mockResolvedValue([["nope"]]);

    await expect(verifyDomainTxtRecord("example.com", sampleRecord.token, resolver)).resolves.toBe(false);
  });
});
