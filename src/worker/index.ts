import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

// Get all settings
app.get("/api/settings", async (c) => {
  const results = await c.env.DB.prepare("SELECT setting_key, setting_value FROM settings").all();
  const settings: Record<string, string> = {};
  for (const row of results.results as { setting_key: string; setting_value: string }[]) {
    settings[row.setting_key] = row.setting_value;
  }
  return c.json(settings);
});

// Update a setting
app.put("/api/settings/:key", async (c) => {
  const key = c.req.param("key");
  const { value } = await c.req.json();
  await c.env.DB.prepare(
    "UPDATE settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?"
  ).bind(value, key).run();
  return c.json({ success: true });
});

// Get all prizes
app.get("/api/prizes", async (c) => {
  const results = await c.env.DB.prepare(
    "SELECT * FROM prizes WHERE is_active = 1 ORDER BY created_at DESC"
  ).all();
  return c.json(results.results);
});

// Add a prize
app.post("/api/prizes", async (c) => {
  const { name, emoji, image_url } = await c.req.json();
  const result = await c.env.DB.prepare(
    "INSERT INTO prizes (name, emoji, image_url) VALUES (?, ?, ?)"
  ).bind(name, emoji || "🎁", image_url || null).run();
  return c.json({ id: result.meta.last_row_id, name, emoji, image_url });
});

// Delete a prize
app.delete("/api/prizes/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM prizes WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// Get all participants
app.get("/api/participants", async (c) => {
  const results = await c.env.DB.prepare(
    "SELECT * FROM participants ORDER BY created_at DESC"
  ).all();
  return c.json(results.results);
});

// Check if phone already played
app.get("/api/participants/check/:phone", async (c) => {
  const phone = c.req.param("phone");
  // Normalize phone number - remove all non-digits for comparison
  const normalizedPhone = phone.replace(/\D/g, "");
  const result = await c.env.DB.prepare(
    "SELECT id FROM participants WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = ?"
  ).bind(normalizedPhone).first();
  return c.json({ exists: !!result });
});

// Add a participant
app.post("/api/participants", async (c) => {
  const { name, phone, prize_won, is_winner } = await c.req.json();
  const result = await c.env.DB.prepare(
    "INSERT INTO participants (name, phone, prize_won, is_winner) VALUES (?, ?, ?, ?)"
  ).bind(name, phone, prize_won || null, is_winner ? 1 : 0).run();
  return c.json({ id: result.meta.last_row_id, name, phone, prize_won, is_winner });
});

// Delete a participant
app.delete("/api/participants/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM participants WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// Delete all participants
app.delete("/api/participants", async (c) => {
  await c.env.DB.prepare("DELETE FROM participants").run();
  return c.json({ success: true });
});

// Upload image for prize
app.post("/api/upload", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file") as File;
  
  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  const buffer = await file.arrayBuffer();
  const filename = `prizes/${Date.now()}-${file.name}`;
  
  await c.env.R2_BUCKET.put(filename, buffer, {
    httpMetadata: { contentType: file.type },
  });

  const url = `/api/files/${filename}`;
  return c.json({ url });
});

// Serve uploaded files
app.get("/api/files/*", async (c) => {
  const path = c.req.path.replace("/api/files/", "");
  const object = await c.env.R2_BUCKET.get(path);
  
  if (!object) {
    return c.json({ error: "File not found" }, 404);
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=31536000");

  return new Response(object.body, { headers });
});

// Admin login verification
app.post("/api/admin/login", async (c) => {
  const { password } = await c.req.json();
  const result = await c.env.DB.prepare(
    "SELECT setting_value FROM settings WHERE setting_key = 'admin_password'"
  ).first() as { setting_value: string } | null;
  
  if (result && result.setting_value === password) {
    return c.json({ success: true });
  }
  return c.json({ success: false, error: "Senha incorreta" }, 401);
});

export default app;
