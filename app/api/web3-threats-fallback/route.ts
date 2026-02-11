import { NextResponse } from "next/server";

interface LlamaHack {
  date?: number;
  name?: string;
  classification?: string;
  technique?: string;
  amount?: number;
  chain?: string[];
  targetType?: string;
  source?: string;
}

const toIsoDate = (timestamp?: number): string => {
  if (!timestamp || Number.isNaN(timestamp)) return "";
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
};

export async function GET() {
  try {
    const upstream = await fetch("https://api.llama.fi/hacks", {
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Failed to fetch fallback data" },
        { status: 502 }
      );
    }

    const items = (await upstream.json()) as LlamaHack[];
    const mapped = (Array.isArray(items) ? items : []).map((item) => ({
      project_name: item.name || "Unknown",
      name_categories: item.targetType || "Other",
      website_link: item.source || null,
      funds_lost: typeof item.amount === "number" ? item.amount : null,
      scam_type: item.classification || "Other",
      date: toIsoDate(item.date),
      root_cause: item.technique || null,
      quick_summary: item.technique || null,
      details: null,
      block_data: null,
      proof_link: item.source || null,
      chain: Array.isArray(item.chain) ? item.chain.join(", ") : null,
      token_name: null,
      token_address: null,
    }));

    mapped.sort((a, b) => String(b.date).localeCompare(String(a.date)));

    return NextResponse.json({
      last_updated: new Date().toISOString(),
      total_records: mapped.length,
      data: mapped,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Fallback route failed", detail: String(error) },
      { status: 500 }
    );
  }
}
