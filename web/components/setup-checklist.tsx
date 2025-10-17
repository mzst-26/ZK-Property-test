const steps = [
  {
    title: "Verify domain",
    description: "Add the DNS TXT record we generated to prove control of your corporate domain."
  },
  {
    title: "Select verification mode",
    description: "Choose between Verifiable Credentials (preferred) or zkEmail DKIM validation."
  },
  {
    title: "Upload issuer keys",
    description: "Provide HR/SSO VC issuer public keys or DKIM selectors so proofs can be verified client-side."
  },
  {
    title: "Publish tree root",
    description: "Seed your org Merkle tree with the empty root and share it with the frontend clients."
  }
];

export function SetupChecklist() {
  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <li key={step.title} className="flex items-start gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary-500 text-sm text-primary-500">
            {index + 1}
          </span>
          <div>
            <h3 className="font-medium text-white">{step.title}</h3>
            <p className="text-sm text-slate-300">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
