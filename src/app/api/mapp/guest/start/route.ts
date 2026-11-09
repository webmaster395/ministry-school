export async function POST() {
  return Response.json({
    error: "Le parcours invité est désactivé. Connectez-vous à Ministry School pour faire le test.",
  }, { status: 410 });
}

