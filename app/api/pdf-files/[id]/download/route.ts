export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type RouteContext = { params: { id: string } | Promise<{ id: string }> };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createSupabase(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) throw new Error("Missing Supabase env vars");

  const cookiesToSet: Array<{ name: string; value: string; options?: any }> = [];

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll().map((c) => ({ name: c.name, value: c.value }));
      },
      setAll(list) {
        cookiesToSet.push(...list);
      },
    },
  });

  return { supabase, cookiesToSet };
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const params = "then" in (ctx.params as any) ? await (ctx.params as any) : (ctx.params as any);
    const id = String(params?.id ?? "");

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const { supabase, cookiesToSet } = createSupabase(req);

    const respond = (body: any, init?: ResponseInit) => {
      const res = NextResponse.json(body, init);
      for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options);
      return res;
    };

    // auth
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) return respond({ error: userErr?.message ?? "Not authenticated" }, { status: 401 });

    // 1) id を fileId として探す（document_files.id）
    const { data: byFileId, error: e1 } = await supabase
      .from("document_files")
      .select("id, document_id")
      .eq("id", id)
      .maybeSingle();

    if (e1) return respond({ error: e1.message }, { status: 500 });

    if (byFileId?.document_id) {
      const url = new URL(`/api/documents/${byFileId.document_id}/pdf-files/${id}/download`, req.url);
      const res = NextResponse.redirect(url, 308);
      for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options);
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    // 2) 見つからなければ id を documentId とみなして、そのドキュメントの最新ファイルに誘導
    const { data: latest, error: e2 } = await supabase
      .from("document_files")
      .select("id, document_id, created_at")
      .eq("document_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (e2) return respond({ error: e2.message }, { status: 500 });

    if (latest?.id && latest?.document_id) {
      const url = new URL(`/api/documents/${latest.document_id}/pdf-files/${latest.id}/download`, req.url);
      const res = NextResponse.redirect(url, 308);
      for (const c of cookiesToSet) res.cookies.set(c.name, c.value, c.options);
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    return respond(
      {
        error: "file not found",
        hint: "id is neither document_files.id (fileId) nor document_files.document_id (documentId), or no files exist for this document",
        id,
      },
      { status: 404 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Internal Server Error" }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}
