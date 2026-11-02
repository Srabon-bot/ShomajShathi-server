#!/usr/bin/env node
/**
 * End-to-end security matrix for the deployed API.
 *
 * Usage (from the server directory):
 *   node scripts/auth-matrix.mjs
 *   API_URL=https://... APP_URL=https://... node scripts/auth-matrix.mjs
 *
 * Creates two temporary accounts, exercises the auth, ownership, validation,
 * CORS and rate-limit paths, then removes the accounts and events again.
 * Requires MONGODB_URI/MONGODB_DB in .env for cleanup (the script prints the
 * two emails if it cannot connect).
 */
import "dotenv/config";
import { MongoClient } from "mongodb";

const API = (process.env.API_URL ?? "https://shomajshathi-server.vercel.app").replace(/\/$/, "");
const APP = (process.env.APP_URL ?? "https://shomajshathi-app.vercel.app").replace(/\/$/, "");
const ORIGIN = APP;
const PASSWORD = "MatrixPass123!";
const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const ownerEmail = `matrix-owner-${stamp}@example.com`;
const otherEmail = `matrix-other-${stamp}@example.com`;
const FUTURE = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
const MISSING_ID = "0123456789abcdef01234567";

const results = [];
let failures = 0;

function record(name, ok, detail = "") {
  if (!ok) failures += 1;
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(42)} ${detail}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function api(path, { method = "GET", token, body, contentType = "application/json", origin = ORIGIN, raw = false } = {}) {
  const headers = {};
  if (origin) headers.Origin = origin;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = contentType;
  const response = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: response.status, json, text, headers: response.headers };
}

async function check(name, expected, path, options) {
  let response = await api(path, options);
  if (response.status === 429 && expected !== 429) {
    console.log("      rate limit hit, waiting 61s for the window to reset...");
    await sleep(61_000);
    response = await api(path, options);
  }
  record(name, response.status === expected, `${response.status} (expected ${expected})`);
  return response;
}

async function signUp(name, email) {
  const response = await fetch(`${APP}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({ name, email, password: PASSWORD, image: "https://example.com/avatar.png" }),
  });
  if (response.status !== 200) {
    throw new Error(`Sign-up failed for ${email}: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const tokenResponse = await fetch(`${APP}/api/auth/token`, { headers: { Cookie: cookie, Origin: ORIGIN } });
  const tokenData = await tokenResponse.json();
  if (!tokenData.token) throw new Error(`No JWT for ${email}: ${tokenResponse.status}`);
  return { email, id: data.user.id, token: tokenData.token };
}

async function cleanup(emails, mongoReady) {
  if (!mongoReady) return;
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "shomaj_shathi");
  const users = await db.collection("user").find({ email: { $in: emails } }).toArray();
  const objectIds = users.map((user) => user._id);
  const stringIds = users.map((user) => user.id ?? String(user._id));
  await db.collection("joins").deleteMany({ userId: { $in: stringIds } });
  await db.collection("events").deleteMany({ organizerEmail: { $in: emails } });
  await db.collection("session").deleteMany({ userId: { $in: objectIds } });
  await db.collection("account").deleteMany({ userId: { $in: objectIds } });
  await db.collection("user").deleteMany({ _id: { $in: objectIds } });
  await client.close();
}

async function main() {
  console.log(`API: ${API}`);
  console.log(`APP: ${APP}`);
  console.log("");

  let mongoReady = Boolean(process.env.MONGODB_URI);
  let owner;
  let other;

  try {
    owner = await signUp("Matrix Owner", ownerEmail);
    other = await signUp("Matrix Other", otherEmail);
    console.log(`accounts: ${ownerEmail}, ${otherEmail}`);
    console.log("");

    const eventBody = {
      title: "Matrix verification event",
      description: "Temporary event created by the security matrix and removed immediately afterwards.",
      type: "Cleanup",
      image: "https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=800",
      location: "Dhaka",
      date: FUTURE,
      capacity: 1,
    };

    await check("public events list", 200, "/api/events");
    await check("write without token", 401, "/api/events", { method: "POST", body: eventBody });
    await check("write with tampered token", 401, "/api/events", { method: "POST", body: eventBody, token: "not-a-jwt" });
    await check("past date rejected", 400, "/api/events", { method: "POST", body: { ...eventBody, date: "2020-01-01T00:00:00.000Z" }, token: owner.token });
    await check("invalid body rejected", 400, "/api/events", { method: "POST", body: { title: "x" }, token: owner.token });

    const created = await check("create own event", 201, "/api/events", { method: "POST", body: eventBody, token: owner.token });
    const eventId = created.json?.data?.id;
    if (!eventId) throw new Error("Created event has no id");

    await check("non-owner patch forbidden", 403, `/api/events/${eventId}`, { method: "PATCH", body: eventBody, token: other.token });
    await check("non-owner delete forbidden", 403, `/api/events/${eventId}`, { method: "DELETE", token: other.token });
    await check("owner patch succeeds", 200, `/api/events/${eventId}`, { method: "PATCH", body: { ...eventBody, title: "Matrix verification event (edited)" }, token: owner.token });
    await check("non-JSON write rejected", 400, "/api/events", { method: "POST", body: "title=x", contentType: "text/plain", token: owner.token });

    await check("owner joins event", 201, `/api/joins/${eventId}`, { method: "POST", token: owner.token });
    await check("duplicate join rejected", 409, `/api/joins/${eventId}`, { method: "POST", token: owner.token });
    await check("join full event rejected", 409, `/api/joins/${eventId}`, { method: "POST", token: other.token });
    const mine = await check("joined list is auth-only", 200, "/api/joins/mine", { token: owner.token });
    record("joined list contains event", Array.isArray(mine.json?.data) && mine.json.data.some((event) => event.id === eventId));
    await check("own events list is auth-only", 200, "/api/events/mine", { token: owner.token });

    const preflight = await fetch(`${API}/api/events`, {
      method: "OPTIONS",
      headers: { Origin: "https://evil.example", "Access-Control-Request-Method": "POST" },
    });
    record("unknown origin gets no allow header", preflight.headers.get("access-control-allow-origin") !== "https://evil.example", String(preflight.headers.get("access-control-allow-origin")));
    const allowed = await fetch(`${API}/api/events`, {
      method: "OPTIONS",
      headers: { Origin: ORIGIN, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type" },
    });
    record("app origin gets allow header", allowed.headers.get("access-control-allow-origin") === ORIGIN, String(allowed.headers.get("access-control-allow-origin")));

    await check("delete own event", 204, `/api/events/${eventId}`, { method: "DELETE", token: owner.token });

    const rapid = [];
    let limitMessage = null;
    for (let index = 0; index < 30; index += 1) {
      const response = await api(`/api/joins/${MISSING_ID}`, { method: "POST", token: owner.token });
      rapid.push(response.status);
      if (response.status === 429 && limitMessage === null) limitMessage = response.json?.message ?? "";
    }
    record("missing event returns 404", rapid.includes(404), `statuses=${rapid.join(",")}`);
    record("rapid writes reach 429", rapid.includes(429), `429s=${rapid.filter((status) => status === 429).length}`);
    record("rate-limit envelope", limitMessage === "Too many requests. Please try again shortly.", String(limitMessage));
  } finally {
    if (owner && other) {
      try {
        await cleanup([ownerEmail, otherEmail], mongoReady);
        record("temporary data cleaned up", true);
      } catch (error) {
        record("temporary data cleaned up", false, error.message);
        console.log(`      delete ${ownerEmail} and ${otherEmail} manually if they remain`);
      }
    }
  }

  console.log("");
  console.log(`Summary: ${results.length - failures}/${results.length} passed`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
