// Role badge — design-system.md §6.3: "neutral pair (slate-100/slate-700),
// no dot — roles are facts, not states."

import type { StaffRole } from "@prisma/client";
import { Badge } from "@/components/ui/badge";

const ROLE_LABEL: Record<StaffRole, string> = {
  ADMINISTRATOR: "Administrator",
  MANAGER: "Manager",
  OPERATOR: "Operator",
  VIEWER: "Viewer",
};

export function RoleBadge({ role }: { role: StaffRole }) {
  return (
    <Badge variant="secondary" className="font-semibold">
      {ROLE_LABEL[role]}
    </Badge>
  );
}
