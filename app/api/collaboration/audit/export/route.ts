import { collaborationAuditExport } from "../../../collaboration";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  try {
    const result = await collaborationAuditExport(request);
    const rows = [
      ["时间", "操作人", "操作", "详情", "记录编号"],
      ...result.entries.map((entry) => [
        entry.createdAt,
        entry.actorName,
        entry.action,
        entry.detail,
        entry.id,
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="xiyuan-audit-${result.exportedAt.slice(0, 10)}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "审计记录导出失败。";
    return Response.json(
      { error: message },
      {
        status: message.includes("登录")
          ? 401
          : message.includes("只有")
            ? 403
            : 400,
        headers: { "cache-control": "no-store" },
      },
    );
  }
}
