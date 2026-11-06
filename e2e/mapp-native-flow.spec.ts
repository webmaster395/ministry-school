import { expect, test } from "@playwright/test";

const email = process.env.E2E_STUDENT_EMAIL;
const password = process.env.E2E_STUDENT_PASSWORD;

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(!email || !password, "Identité synthétique de validation absente");
  testInfo.annotations.push({ type: "data", description: "Compte synthétique uniquement" });
  await page.goto("/login");
  await page.getByLabel(/e-?mail/i).fill(email!);
  await page.getByLabel(/mot de passe/i).fill(password!);
  await page.getByRole("button", { name: /se connecter/i }).click();
  await expect(page).toHaveURL(/\/(etudiant|apps)/);
});

test("Ministry → Mes outils → MAPP → 50 réponses → résultat → PDF", async ({ page, context }) => {
  await page.goto("/apps");
  await page.getByRole("link", { name: /profil mapp/i }).click();
  await expect(page).toHaveURL(/\/apps\/profil-mapp/);
  await expect(page.getByText(/1 \/ 10/)).toBeVisible();

  for (let pageIndex = 0; pageIndex < 10; pageIndex += 1) {
    const groups = page.getByRole("group");
    await expect(groups).toHaveCount(5);
    for (let question = 0; question < 5; question += 1) {
      await groups.nth(question).getByRole("radio").nth((pageIndex + question) % 5).click();
    }
    if (pageIndex < 9) await page.getByRole("button", { name: /continuer/i }).click();
  }

  await page.getByRole("button", { name: /découvrir mon profil/i }).click();
  await expect(page.getByText(/ton profil est/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /fonctionnement|forces|grandir/i }).first()).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /conserver mon profil/i }).click();
  await page.getByRole("menuitem", { name: /télécharger en pdf/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^profil-mapp-.+\.pdf$/);

  const secondPage = await context.newPage();
  await secondPage.goto("/apps/profil-mapp");
  await expect(secondPage.getByText(/ton profil est/i)).toBeVisible();
});

test("un étudiant ne peut pas lire le résultat d'un autre", async ({ request }) => {
  const foreignAttempt = process.env.E2E_FOREIGN_ATTEMPT_ID;
  test.skip(!foreignAttempt, "Tentative synthétique étrangère absente");
  const response = await request.get(`/api/apps/profil-mapp/results/${foreignAttempt}/pdf`);
  expect([403, 404]).toContain(response.status());
});
