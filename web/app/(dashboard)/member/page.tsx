import { MegaphoneIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";

import { PasskeyBanner } from "../../../components/passkey-banner";
import { ProofFlow } from "../../../components/proof-flow";
import { SectionCard } from "../../../components/section-card";

export default function MemberWorkspace() {
  return (
    <div className="space-y-10">
      <SectionCard
        title="Join anonymously"
        description="Generate your member secret, prove eligibility, and receive a Merkle receipt."
        icon={ShieldExclamationIcon}
      >
        <div className="space-y-6">
          <ProofFlow />
          <PasskeyBanner />
        </div>
      </SectionCard>
      <SectionCard
        title="Channel activity"
        description="Post feedback and votes with zero-knowledge receipts that moderators can audit."
        icon={MegaphoneIcon}
      >
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            Every post emits a scope-specific nullifier. RLN prevents spam while keeping your identity unlinkable.
          </p>
          <p>
            Poll votes are encrypted and tallied homomorphically. Download receipts to verify the published tally proofs.
          </p>
        </div>
      </SectionCard>
    </div>
  );
}
