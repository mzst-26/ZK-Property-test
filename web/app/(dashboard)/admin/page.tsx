import { ShieldCheckIcon, UserPlusIcon } from "@heroicons/react/24/outline";

import { SectionCard } from "../../../components/section-card";
import { SetupChecklist } from "../../../components/setup-checklist";

export default function AdminConsole() {
  return (
    <div className="space-y-10">
      <SectionCard
        title="Organization setup"
        description="Verify your domain, choose an enrollment mode, and seed your Merkle tree."
        icon={ShieldCheckIcon}
      >
        <SetupChecklist />
      </SectionCard>
      <SectionCard
        title="Invite members"
        description="Generate invite links or trigger HR credential issuance to onboard employees."
        icon={UserPlusIcon}
      >
        <div className="space-y-4 text-sm text-slate-300">
          <p>
            Share the invite link below or upload a CSV of email addresses to send DKIM-signed invites. For VC flows, connect
            your SSO provider via OpenID4VCI and define attribute mappings.
          </p>
          <div className="rounded-md border border-dashed border-white/20 p-4">
            <p className="font-mono text-xs text-slate-400">https://anon.org/join/your-org</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
