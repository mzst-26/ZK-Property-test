export function PasskeyBanner() {
  return (
    <div className="rounded-lg border border-white/20 bg-slate-900/80 p-4 text-sm text-slate-300">
      <p className="font-medium text-white">Passkey sessions</p>
      <p className="mt-1">
        We rely on platform WebAuthn credentials. During onboarding, you will register a new passkey; subsequent visits
        require biometric or device confirmation—no passwords involved.
      </p>
    </div>
  );
}
