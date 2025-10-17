export interface OrgSummary {
  id: string;
  name: string;
  domain: string;
  verification_modes: string[];
  tree_root_current: string;
}

function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  return base.replace(/\/$/, "");
}

export async function fetchOrg(domain: string): Promise<OrgSummary | null> {
  const res = await fetch(`${getApiBase()}/orgs/${domain}`, {
    cache: "no-store"
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data.org;
}
