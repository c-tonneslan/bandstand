// Vercel Cron entry point. Vercel pings this on the schedule defined in
// vercel.json. The handler verifies the request actually came from the
// Vercel Cron infrastructure (CRON_SECRET on Authorization), then POSTs to
// the project's Deploy Hook URL. The hook triggers a fresh build, the build
// runs `prebuild` → scripts/refresh.ts, and the new scraped.json gets baked
// into the static output.
//
// Required env (set in the Vercel project dashboard):
//   CRON_SECRET            random string Vercel sends as Authorization
//   VERCEL_DEPLOY_HOOK_URL Deploy Hook URL created from Project Settings

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const hook = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hook) {
    return NextResponse.json(
      { error: "VERCEL_DEPLOY_HOOK_URL not configured" },
      { status: 500 },
    );
  }

  const res = await fetch(hook, { method: "POST" });
  const body = await res.text();
  return NextResponse.json({
    triggered: res.ok,
    status: res.status,
    body: body.slice(0, 200),
    at: new Date().toISOString(),
  });
}
