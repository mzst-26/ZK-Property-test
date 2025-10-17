import { resolveTxt } from "dns/promises";

import type { DomainVerificationRecord } from "../services/domain-verification-service.js";

export const DOMAIN_TXT_HOST_PREFIX = "_zk-workspace";
export const DOMAIN_TXT_VALUE_PREFIX = "zk-workspace-verification=";

export interface DomainChallengePresentation {
  status: DomainVerificationRecord["status"];
  hostname: string;
  record: string;
  token: string;
  verified_at: string | null;
}

type TxtResolver = (hostname: string) => Promise<string[][]>;

export function buildDomainChallenge(
  domain: string,
  record: DomainVerificationRecord
): DomainChallengePresentation {
  const hostname = `${DOMAIN_TXT_HOST_PREFIX}.${domain}`;
  return {
    status: record.status,
    hostname,
    record: `${DOMAIN_TXT_VALUE_PREFIX}${record.token}`,
    token: record.token,
    verified_at: record.verified_at ? record.verified_at.toISOString() : null
  };
}

export async function verifyDomainTxtRecord(
  domain: string,
  token: string,
  resolver: TxtResolver = resolveTxt
): Promise<boolean> {
  const hostname = `${DOMAIN_TXT_HOST_PREFIX}.${domain}`;
  const expected = `${DOMAIN_TXT_VALUE_PREFIX}${token}`;

  try {
    const records = await resolver(hostname);
    const flattened = records.flat().map((entry) => entry.trim());
    return flattened.some((value) => value === expected);
  } catch (error) {
    return false;
  }
}
