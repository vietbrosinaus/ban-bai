import { RuleError } from "@/lib/domain/table";
import { tableService } from "@/lib/composition";

function cleanName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: unknown; deck?: unknown };
    const name = cleanName(body.name);
    if (!name) throw new RuleError("Nhập tên trước đã.", 400);
    const deck = body.deck === "classic-52" ? "classic-52" : "tam-quoc-sat";
    return Response.json(await tableService().createTable(name, deck), { status: 201 });
  } catch (error) {
    const status = error instanceof RuleError ? error.status : 500;
    const message = error instanceof RuleError ? error.message : "Không tạo được bàn.";
    return Response.json({ error: message }, { status });
  }
}
