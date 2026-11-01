import ToolLanding, { toolMetadata } from "@/components/ToolLanding";
import { getTool } from "@/lib/tools";

const t = getTool("find-clothes-from-picture");
export const metadata = toolMetadata(t);
export default function Page() {
  return <ToolLanding t={t} />;
}
