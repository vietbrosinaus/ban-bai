import { PrototypeSwitcher } from "@/components/prototype-switcher";

import VariantA, { NAME as NAME_A } from "./variant-a";
import VariantB, { NAME as NAME_B } from "./variant-b";
import VariantC, { NAME as NAME_C } from "./variant-c";
import "./proto.css";

const names: Record<string, string> = { A: NAME_A, B: NAME_B, C: NAME_C };

export default async function TablePrototype({ searchParams }: { searchParams: Promise<{ variant?: string; shot?: string }> }) {
  const params = await searchParams;
  const variant = params.variant?.toUpperCase() ?? "A";
  return (
    <main className={`proto-root ${params.shot ? "proto-shot" : ""}`}>
      {variant === "B" ? <VariantB /> : variant === "C" ? <VariantC /> : <VariantA />}
      <PrototypeSwitcher variants={["A", "B", "C"]} names={names} current={variant in names ? variant : "A"} />
    </main>
  );
}
