import { createPool } from "./db";

const pool = createPool();

const zones = ["Quiet North", "Window Row", "Focus Pods", "Group Study"];
const features = [
  ["silent", "charging"],
  ["window"],
  ["accessible", "wide-desk"],
  ["group", "whiteboard"]
];

function buildDesks() {
  const desks = [];

  for (let floor = 1; floor <= 2; floor += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const index = row * 4 + col + 1;
        const code = `F${floor}-${String(index).padStart(2, "0")}`;
        const zoneIndex = row % zones.length;
        desks.push({
          code,
          label: `${floor === 1 ? "A" : "B"}-${String(index).padStart(2, "0")}`,
          floor,
          zone: zones[zoneIndex],
          x: 10 + col * 20,
          y: 14 + row * 19,
          width: 10,
          height: 8,
          qr_token: `printed-fallback:${code}`,
          is_accessible: zoneIndex === 2 && col === 0,
          features: features[zoneIndex]
        });
      }
    }
  }

  return desks;
}

function displayPublicId(code: string) {
  return `display-${code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-live`;
}

try {
  await pool.query(
    `
      truncate public.audit_logs,
               public.notifications,
               public.sessions,
               public.desk_qr_challenges,
               public.desk_qr_displays,
               public.desks
      restart identity cascade
    `
  );

  for (const desk of buildDesks()) {
    const inserted = await pool.query<{ id: string }>(
      `
        insert into public.desks (code, label, floor, zone, x, y, width, height, qr_token, features, is_accessible)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        returning id
      `,
      [
        desk.code,
        desk.label,
        desk.floor,
        desk.zone,
        desk.x,
        desk.y,
        desk.width,
        desk.height,
        desk.qr_token,
        desk.features,
        desk.is_accessible
      ]
    );

    await pool.query(
      `
        insert into public.desk_qr_displays (desk_id, display_public_id, display_name)
        values ($1, $2, $3)
        on conflict (display_public_id) do update
          set desk_id = excluded.desk_id,
              display_name = excluded.display_name,
              is_active = true
      `,
      [inserted.rows[0].id, displayPublicId(desk.code), `${desk.label} Live Display`]
    );
  }

  await pool.query(
    `
      update public.desks
         set status = 'unavailable',
             status_changed_at = now()
       where code = 'F1-14'
    `
  );

  await pool.query(
    `
      insert into public.audit_logs (actor_role, action, details)
      values ('system', 'seed_library_layout', '{"source":"seed","note":"No users or live sessions are seeded."}'::jsonb)
    `
  );

  console.log("DeskGuard desks and live QR displays seeded.");
  console.log("Create users through the website, then promote librarians with SQL when needed.");
} finally {
  await pool.end();
}
