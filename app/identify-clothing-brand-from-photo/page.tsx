import ToolLanding, { toolMetadata } from "@/components/ToolLanding";
import { getTool } from "@/lib/tools";

const t = getTool("identify-clothing-brand-from-photo");
export const metadata = toolMetadata(t);
export default function Page() {
  return <ToolLanding t={t} />;
}
