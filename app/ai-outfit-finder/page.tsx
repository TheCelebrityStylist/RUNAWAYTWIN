import ToolLanding, { toolMetadata } from "@/components/ToolLanding";
import { getTool } from "@/lib/tools";

const t = getTool("ai-outfit-finder");
export const metadata = toolMetadata(t);
export default function Page() {
  return <ToolLanding t={t} />;
}
