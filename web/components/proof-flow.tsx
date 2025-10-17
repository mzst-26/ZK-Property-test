const steps = [
  {
    title: "Generate secret",
    detail: "Create a member_secret locally. It never leaves your device."
  },
  {
    title: "Select proof path",
    detail: "Use your HR-issued VC or prove an invite email via zkEmail."
  },
  {
    title: "Produce Noir proof",
    detail: "The worker compiles witnesses, runs Barretenberg, and outputs member_commitment."
  },
  {
    title: "Receive receipt",
    detail: "Server verifies, inserts your leaf, and returns the updated org root."
  }
];

export function ProofFlow() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {steps.map((step, index) => (
        <div key={step.title} className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wide text-primary-400">Step {index + 1}</p>
          <h3 className="mt-2 text-sm font-semibold text-white">{step.title}</h3>
          <p className="mt-1 text-sm text-slate-300">{step.detail}</p>
        </div>
      ))}
    </div>
  );
}
