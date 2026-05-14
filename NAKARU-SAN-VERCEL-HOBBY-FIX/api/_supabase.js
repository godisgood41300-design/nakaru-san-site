import { randomUUID } from "node:crypto";

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";
const bucket = process.env.SUPABASE_BUCKET || "nakaru-uploads";

export const hasSupabase = Boolean(supabaseUrl && serviceKey);

function headers(extra = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function rest(path, options = {}) {
  if (!hasSupabase) return null;
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: headers(options.headers)
  });
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
  if (response.status === 204) return null;
  return response.json();
}

export async function findAccountByEmail(email) {
  const rows = await rest(`accounts?email=eq.${encodeURIComponent(email)}&limit=1`);
  return rows?.[0] || null;
}

export async function findAccountById(id) {
  const rows = await rest(`accounts?id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows?.[0] || null;
}

export async function createAccount(account) {
  const rows = await rest("accounts", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(account)
  });
  return rows?.[0] || account;
}

export async function createSession(session) {
  await rest("sessions", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(session)
  });
}

export async function deleteSession(id) {
  await rest(`sessions?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function findSessionAccountId(id) {
  const rows = await rest(`sessions?id=eq.${encodeURIComponent(id)}&limit=1`);
  return rows?.[0]?.account_id || "";
}

export async function listFeedPosts() {
  return (await rest("feed_posts?appropriate=eq.true&order=at.desc")) || [];
}

export async function createFeedPost(post) {
  const rows = await rest("feed_posts", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(post)
  });
  return rows?.[0] || post;
}

export async function listMessages(room) {
  return (await rest(`public_messages?room=eq.${encodeURIComponent(room)}&order=at.asc`)) || [];
}

export async function createMessage(message) {
  const rows = await rest("public_messages", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(message)
  });
  return rows?.[0] || message;
}

export async function listDirectMessages(thread) {
  return (await rest(`direct_messages?thread=eq.${encodeURIComponent(thread)}&order=at.asc`)) || [];
}

export async function createDirectMessage(message) {
  const rows = await rest("direct_messages", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(message)
  });
  return rows?.[0] || message;
}

export async function uploadDataUrl(dataUrl, folder = "posts") {
  if (!hasSupabase || !dataUrl?.startsWith("data:image/")) return dataUrl || "";

  const [meta, encoded] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);base64/)?.[1] || "image/png";
  const ext = mime.split("/")[1] || "png";
  const objectPath = `${folder}/${randomUUID()}.${ext}`;
  const bytes = Buffer.from(encoded, "base64");

  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": mime,
      "x-upsert": "false"
    },
    body: bytes
  });
  if (!response.ok) throw new Error(`Supabase upload failed: ${response.status}`);
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}
