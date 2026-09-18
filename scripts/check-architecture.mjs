import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

const LAYERS = [
  ["party", (p) => p.startsWith("party/")],
  ["domain", (p) => p.startsWith("lib/domain/")],
  ["ports", (p) => p.startsWith("lib/ports/")],
  ["adapters", (p) => p.startsWith("lib/adapters/")],
  ["ui", (p) => p.startsWith("components/") || p.startsWith("app/") || p.startsWith("hooks/")],
  ["shared", (p) => p.startsWith("lib/")],
];

const MAY_IMPORT = {
  domain: ["domain"],
  ports: ["domain", "ports"],
  adapters: ["domain", "ports", "adapters"],
  party: ["domain", "ports", "adapters", "party"],
  ui: ["domain", "ui", "shared"],
  shared: ["domain", "adapters", "shared"],
};

const FORBIDDEN_IN_DOMAIN = [
  [/\bDate\.now\s*\(/, "Date.now"],
  [/\bMath\.random\s*\(/, "Math.random"],
  [/\bcrypto\./, "crypto"],
  [/\bfetch\s*\(/, "fetch"],
  [/\bprocess\.env\b/, "process.env"],
  [/from\s+"node:/, "node: builtin"],
];

function layerOf(path) {
  for (const [name, test] of LAYERS) if (test(path)) return name;
  return null;
}

const files = globSync("{lib,app,components,hooks,party}/**/*.{ts,tsx}", { cwd: process.cwd() })
  .filter((p) => !p.includes("node_modules") && !p.startsWith("components/ui/") && !p.includes("/prototype/"));

const problems = [];

for (const file of files) {
  const layer = layerOf(file);
  if (!layer) continue;
  const source = readFileSync(file, "utf8");

  if (layer === "domain") {
    for (const [pattern, name] of FORBIDDEN_IN_DOMAIN) {
      if (pattern.test(source)) problems.push(`${file}: domain must stay pure, found ${name}`);
    }
  }

  for (const match of source.matchAll(/from\s+"(@\/[^"]+)"/g)) {
    const target = match[1].replace(/^@\//, "");
    const targetLayer = layerOf(target) ?? layerOf(`${target}.ts`) ?? layerOf(`${target}/index.ts`);
    if (!targetLayer) continue;
    const allowed = MAY_IMPORT[layer] ?? [];
    if (!allowed.includes(targetLayer)) {
      problems.push(`${file} (${layer}) may not import ${target} (${targetLayer})`);
    }
  }
}

if (problems.length) {
  console.error("Architecture fences broken:\n");
  for (const problem of problems) console.error("  " + problem);
  console.error(`\n${problems.length} problem(s).`);
  process.exit(1);
}

console.log(`Architecture fences hold across ${files.length} files.`);
