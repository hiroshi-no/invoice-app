// scripts/rls-test.mjs
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const USER_A = {
  email: process.env.RLS_TEST_USER_A_EMAIL,
  password: process.env.RLS_TEST_USER_A_PASSWORD,
};
const USER_B = {
  email: process.env.RLS_TEST_USER_B_EMAIL,
  password: process.env.RLS_TEST_USER_B_PASSWORD,
};

if (!USER_A.email || !USER_A.password || !USER_B.email || !USER_B.password) {
  console.error("Missing env: RLS_TEST_USER_A_* / RLS_TEST_USER_B_*");
  process.exit(1);
}

function client() {
  return createClient(url, anon, { auth: { persistSession: false } });
}

async function signInAs(supabase, user) {
  const { data, error } = await supabase.auth.signInWithPassword(user);
  if (error) throw new Error(`signIn failed: ${error.message}`);
  if (!data.session) throw new Error("No session returned");
}

async function insertCustomerPersonalOnly(supabase, name) {
  // ✅ 個人専用：customers.created_by は DB default(auth.uid()) を期待
  // ※もし org_id が NOT NULL で挿入できない場合は、ここでエラーになります
  const { data, error } = await supabase
    .from("customers")
    .insert({ name })
    .select("id, name, created_by")
    .single();

  if (error) {
    throw new Error(`insert customer failed: ${error.message}
(もし "org_id" が必須と言われるなら、customers.org_id を nullable にするか、アプリ運用として org を必ず作る方針にする必要があります)`);
  }
  return data;
}

async function canSeeCustomerById(supabase, id) {
  const { data, error } = await supabase
    .from("customers")
    .select("id")
    .eq("id", id)
    .limit(1);

  if (error) throw new Error(`select customer failed: ${error.message}`);
  return (data ?? []).length > 0;
}

(async () => {
  console.log("=== RLS TEST (personal-only) START ===");

  // ---- User A ----
  const supaA = client();
  await signInAs(supaA, USER_A);
  const created = await insertCustomerPersonalOnly(supaA, `Customer by A @ ${new Date().toISOString()}`);
  console.log("[A] inserted customer:", created);

  const visibleToA = await canSeeCustomerById(supaA, created.id);
  console.log("[A] can see own customer? ->", visibleToA ? "YES" : "NO");

  // ---- User B ----
  const supaB = client();
  await signInAs(supaB, USER_B);

  const visibleToB = await canSeeCustomerById(supaB, created.id);
  console.log("[B] can see A's customer? ->", visibleToB ? "YES" : "NO");

  if (visibleToB) {
    console.log("❌ RLS NG: B が A の customer を見えています");
    process.exit(2);
  } else {
    console.log("✅ RLS OK: B は A の customer を見えません");
  }

  console.log("=== RLS TEST END ===");
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
