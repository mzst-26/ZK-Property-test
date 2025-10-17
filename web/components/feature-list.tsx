const features = [
  {
    title: "Domain-verified orgs",
    description: "DNS + VC/zkEmail attestations ensure only real employees enroll."
  },
  {
    title: "Passkey sessions",
    description: "Device-bound WebAuthn sessions protect access without passwords."
  },
  {
    title: "Anonymous channels",
    description: "Post and comment with RLN guardrails to prevent spam and Sybils."
  },
  {
    title: "Auditable polls",
    description: "Encrypted ballots with public tally proofs keep decisions transparent."
  }
];

export function FeatureList() {
  return (
    <ul className="space-y-4">
      {features.map((feature) => (
        <li key={feature.title} className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
          <h3 className="text-sm font-semibold text-white">{feature.title}</h3>
          <p className="mt-1 text-sm text-slate-300">{feature.description}</p>
        </li>
      ))}
    </ul>
  );
}
