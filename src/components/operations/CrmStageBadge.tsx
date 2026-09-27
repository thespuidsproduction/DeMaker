import { Badge } from '@/components/ui/badge';
import { CRM_STAGE_LABEL, type CrmStage } from '@/domain/crm';

/** The stage, in the same register everywhere the desk shows it. */
export function CrmStageBadge({ stage }: { stage: CrmStage }) {
  const variant =
    stage === 'active' || stage === 'onboarding'
      ? 'olive'
      : stage === 'in_conversation'
        ? 'champagne'
        : stage === 'do_not_contact'
          ? 'ink'
          : 'muted';
  return <Badge variant={variant}>{CRM_STAGE_LABEL[stage]}</Badge>;
}
