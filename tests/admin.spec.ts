import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

async function ensureSilo() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required for tests");
  }

  const publicClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: existing, error: fetchError } = await publicClient.from("silos").select("id,slug").limit(1);
  if (fetchError) throw fetchError;
  if (existing && existing.length > 0) {
    return existing[0];
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;

  const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
  const slug = `silo-teste-${Date.now()}`;

  const { data: inserted, error } = await adminClient
    .from("silos")
    .insert({ name: "Silo Teste", slug, description: "Silo para testes" })
    .select("id,slug")
    .maybeSingle();

  if (error) {
    if ((error as any).code === "42501") return null;
    throw error;
  }
  if (!inserted) return null;
  return inserted;
}

test("admin protection blocks access and rejects wrong password", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);

  const badLogin = await request.post("/api/admin/login", {
    form: { password: "wrong-password" },
  });
  expect(badLogin.status()).toBe(401);
});

test("admin can create draft and publish/unpublish", async ({ page }) => {
  const password = process.env.ADMIN_PASSWORD;
  expect(password, "ADMIN_PASSWORD env required for tests").toBeTruthy();

  await page.goto("/admin/login");
  await page.fill('input[name="password"]', password ?? "");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin$/);

  await page.click('a[href="/admin/editor/new"]');
  await expect(page).toHaveURL(/\/admin\/editor\/new/);

  const silo = await ensureSilo();
  if (!silo) {
    test.skip(true, "Sem silos disponiveis. Configure SUPABASE_SERVICE_ROLE_KEY e rode o seed.");
  }
  const seed = Date.now();
  const title = `Teste ${seed}`;
  const slug = `teste-${seed}`;

  await page.selectOption('select[name="silo_id"]', { value: silo.id });
  await page.fill('input[name="title"]', title);
  await page.fill('input[name="slug"]', slug);
  await page.fill('input[name="target_keyword"]', "teste keyword");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin\/editor\//);

  const editorUrl = page.url();
  const urlText = await page.locator("p", { hasText: "URL:" }).first().textContent();
  const previewPath = urlText?.replace("URL:", "").trim();
  expect(previewPath, "Preview URL should be present").toBeTruthy();

  await page.goto("/admin");
  await expect(page.getByText(title)).toBeVisible();
  await expect(page.getByRole("cell", { name: "Rascunho" }).first()).toBeVisible();

  await page.goto(editorUrl);
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("Post publicado.")).toBeVisible();

  const publishedResponse = await page.goto(previewPath ?? "", { waitUntil: "domcontentloaded" });
  expect(publishedResponse?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();

  await page.goto(editorUrl);
  await page.getByRole("button", { name: "Despublicar" }).click();
  await expect(page.getByText("Post despublicado.")).toBeVisible();

  const unpublishedResponse = await page.goto(previewPath ?? "", { waitUntil: "domcontentloaded" });
  expect(unpublishedResponse?.status()).toBe(404);
});
