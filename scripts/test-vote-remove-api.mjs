#!/usr/bin/env node
/**
 * Smoke test for wallet-based vote-to-remove API.
 * Run with: node scripts/test-vote-remove-api.mjs [BASE_URL]
 * Default BASE_URL: http://localhost:3000
 * Requires the Next.js dev server to be running.
 */

const BASE = process.argv[2] || "http://localhost:3000";
const roomId = "test-room-" + Date.now();

async function request(method, path, body = null) {
  const url = path.startsWith("http") ? path : `${BASE}${path}`;
  const opts = { method, headers: {} };
  if (body && (method === "POST" || method === "PUT")) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }
  return { status: res.status, json, text };
}

async function run() {
  let passed = 0;
  let failed = 0;

  function ok(condition, name) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${name}`);
    } else {
      failed++;
      console.log(`  ✗ ${name}`);
    }
  }

  console.log("Testing vote-remove API at", BASE);
  console.log("");

  // POST without auth -> 401
  const postNoAuth = await request("POST", `/api/rooms/${roomId}/vote-remove`, {
    target_user_id: "00000000-0000-0000-0000-000000000001",
  });
  ok(postNoAuth.status === 401, "POST vote-remove without auth returns 401");

  // POST with auth but missing target_user_id -> 400 (or 401 if no auth)
  const postBadBody = await request("POST", `/api/rooms/${roomId}/vote-remove`, {});
  ok(
    postBadBody.status === 400 || postBadBody.status === 401,
    "POST with missing target_user_id returns 400 or 401"
  );

  // GET without auth -> 401
  const getNoAuth = await request("GET", `/api/rooms/${roomId}/vote-remove`);
  ok(getNoAuth.status === 401, "GET vote-remove without auth returns 401");

  // GET members without auth -> 401
  const membersNoAuth = await request("GET", `/api/rooms/${roomId}/members`);
  ok(membersNoAuth.status === 401, "GET members without auth returns 401");

  // DELETE without auth -> 401
  const delNoAuth = await request(
    "DELETE",
    `/api/rooms/${roomId}/vote-remove?target_user_id=00000000-0000-0000-0000-000000000001`
  );
  ok(delNoAuth.status === 401, "DELETE vote without auth returns 401");

  console.log("");
  console.log(`Result: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  if (err.cause?.code === "ECONNREFUSED" || err.message?.includes("fetch")) {
    console.error("Cannot connect to server. Start the dev server first:");
    console.error("  pnpm dev");
    console.error("Then run: node scripts/test-vote-remove-api.mjs");
  } else {
    console.error("Test run failed:", err.message);
  }
  process.exit(1);
});
