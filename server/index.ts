import cors from "cors";
import { createHash, randomBytes } from "node:crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";
import type { PoolClient } from "pg";
import { createPool } from "../scripts/db";
import { boolEnv, intEnv, requiredEnv } from "../scripts/env";

type UserRole = "student" | "librarian" | "admin";

type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  citizenship_score: number;
};

type AuthedRequest = Request & {
  auth: {
    id: string;
    email: string;
    profile: Profile;
  };
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const app = express();
const pool = createPool();
const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DEMO_MODE = boolEnv("DEMO_MODE", true);
const SESSION_SECONDS = intEnv("DEMO_SESSION_SECONDS", DEMO_MODE ? 60 : 7200);
const AWAY_SECONDS = intEnv("DEMO_AWAY_SECONDS", DEMO_MODE ? 20 : 1200);
const SWEEP_SECONDS = intEnv("DEMO_SWEEP_SECONDS", DEMO_MODE ? 5 : 60);
const ABANDONED_RELEASE_SECONDS = intEnv("DEMO_ABANDONED_RELEASE_SECONDS", DEMO_MODE ? 10 : 60);
const WARNING_SECONDS = DEMO_MODE ? 15 : 300;
const QR_ROTATION_SECONDS = intEnv("QR_ROTATION_SECONDS", 120);
const QR_TOKEN_EXPIRY_SECONDS = intEnv("QR_TOKEN_EXPIRY_SECONDS", 120);
const QR_TOKEN_GRACE_SECONDS = intEnv("QR_TOKEN_GRACE_SECONDS", 5);
const QR_FALLBACK_MODE_ENABLED = boolEnv("QR_FALLBACK_MODE_ENABLED", false);
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:5173";

const asyncHandler =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };

app.use(cors());
app.use(express.json());

async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    next(new HttpError(401, "Sign in first."));
    return;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    next(new HttpError(401, "Your session expired. Please sign in again."));
    return;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,citizenship_score")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    next(profileError);
    return;
  }

  let resolvedProfile = profile as Profile | null;

  if (!resolvedProfile) {
    const fullName =
      typeof userData.user.user_metadata?.full_name === "string"
        ? userData.user.user_metadata.full_name
        : userData.user.email?.split("@")[0] || "Student";
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: userData.user.id,
        email: userData.user.email ?? "",
        full_name: fullName,
        role: "student"
      })
      .select("id,email,full_name,role,citizenship_score")
      .single();

    if (insertError || !inserted) {
      next(new HttpError(403, "No DeskGuard profile exists for this account."));
      return;
    }

    resolvedProfile = inserted as Profile;
  }

  if (!resolvedProfile) {
    next(new HttpError(403, "No DeskGuard profile exists for this account."));
    return;
  }

  (req as AuthedRequest).auth = {
    id: userData.user.id,
    email: userData.user.email ?? resolvedProfile.email,
    profile: resolvedProfile
  };

  next();
}

function requireStaff(req: AuthedRequest) {
  if (!["librarian", "admin"].includes(req.auth.profile.role)) {
    throw new HttpError(403, "Librarian access is required.");
  }
}

function requireStudent(req: AuthedRequest) {
  if (req.auth.profile.role !== "student") {
    throw new HttpError(403, "Student accounts claim desks. Use the librarian dashboard for staff actions.");
  }
}

function hashQrToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cleanBaseUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return APP_BASE_URL;
  }

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      return APP_BASE_URL;
    }
    return url.origin;
  } catch {
    return APP_BASE_URL;
  }
}

function claimUrlFor(token: string, baseUrl: string) {
  return `${baseUrl.replace(/\/$/, "")}/claim?token=${encodeURIComponent(token)}`;
}

function randomPublicId(code: string) {
  const safeCode = code.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `display-${safeCode}-${randomBytes(4).toString("hex")}`;
}

async function buildState(auth: AuthedRequest["auth"]) {
  const deskColumns =
    "id,code,label,floor,zone,x,y,width,height,status,features,is_accessible,current_session_id,status_changed_at,created_at,updated_at";

  const [desksResult, profileResult, activeResult, notificationResult] = await Promise.all([
    supabase.from("desks").select(deskColumns).order("floor", { ascending: true }).order("label", { ascending: true }),
    supabase.from("profiles").select("id,email,full_name,role,citizenship_score").eq("id", auth.id).single(),
    supabase
      .from("sessions")
      .select(`*, desk:desks(${deskColumns})`)
      .eq("user_id", auth.id)
      .in("status", ["active", "away"])
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", auth.id)
      .order("created_at", { ascending: false })
      .limit(8)
  ]);

  if (desksResult.error) throw desksResult.error;
  if (profileResult.error) throw profileResult.error;
  if (activeResult.error) throw activeResult.error;
  if (notificationResult.error) throw notificationResult.error;

  const isStaff = ["librarian", "admin"].includes(profileResult.data.role);

  const sessionsQuery = supabase
    .from("sessions")
    .select(`*, desk:desks(${deskColumns}), profile:profiles(id,email,full_name,role,citizenship_score)`)
    .order("created_at", { ascending: false })
    .limit(isStaff ? 80 : 20);

  if (!isStaff) {
    sessionsQuery.eq("user_id", auth.id);
  }

  const auditQuery = supabase
    .from("audit_logs")
    .select("*, desk:desks(id,label,code,floor,zone,status)")
    .order("created_at", { ascending: false })
    .limit(isStaff ? 80 : 20);

  if (!isStaff) {
    auditQuery.or(`actor_id.eq.${auth.id},actor_role.eq.system`);
  }

  const profilesQuery = isStaff
    ? supabase.from("profiles").select("id,email,full_name,role,citizenship_score").order("full_name")
    : Promise.resolve({ data: [], error: null });
  const displaysQuery = isStaff
    ? supabase
        .from("desk_qr_displays")
        .select("*, desk:desks(id,code,label,floor,zone,status)")
        .order("display_name")
    : Promise.resolve({ data: [], error: null });

  const [sessionsResult, auditResult, profilesResult, displaysResult] = await Promise.all([
    sessionsQuery,
    auditQuery,
    profilesQuery,
    displaysQuery
  ]);

  if (sessionsResult.error) throw sessionsResult.error;
  if (auditResult.error) throw auditResult.error;
  if (profilesResult.error) throw profilesResult.error;
  if (displaysResult.error) throw displaysResult.error;

  return {
    config: {
      demoMode: DEMO_MODE,
      sessionSeconds: SESSION_SECONDS,
      awaySeconds: AWAY_SECONDS,
      warningSeconds: WARNING_SECONDS,
      sweepSeconds: SWEEP_SECONDS,
      abandonedReleaseSeconds: ABANDONED_RELEASE_SECONDS,
      qrRotationSeconds: QR_ROTATION_SECONDS,
      qrTokenExpirySeconds: QR_TOKEN_EXPIRY_SECONDS,
      qrTokenGraceSeconds: QR_TOKEN_GRACE_SECONDS,
      qrFallbackModeEnabled: QR_FALLBACK_MODE_ENABLED
    },
    profile: profileResult.data,
    desks: desksResult.data,
    activeSession: activeResult.data,
    notifications: notificationResult.data,
    sessions: sessionsResult.data,
    auditLogs: auditResult.data,
    profiles: profilesResult.data,
    qrDisplays: displaysResult.data
  };
}

let cleanupRunning = false;

async function runCleanup(trigger: string) {
  if (cleanupRunning) {
    return { skipped: true, abandoned: 0, released: 0 };
  }

  cleanupRunning = true;
  const client = await pool.connect();

  try {
    await client.query("begin");

    const expired = await client.query<{
      id: string;
      user_id: string;
      desk_id: string;
      status: "active" | "away";
      label: string;
    }>(
      `
        select s.id, s.user_id, s.desk_id, s.status, d.label
          from public.sessions s
          join public.desks d on d.id = s.desk_id
         where (
            (s.status = 'away' and s.away_expires_at is not null and s.away_expires_at <= now())
            or
            (s.status = 'active' and s.active_expires_at is not null and s.active_expires_at <= now())
         )
         for update of s
      `
    );

    for (const row of expired.rows) {
      const reason = row.status === "away" ? "away_timeout" : "presence_timeout";
      await client.query(
        `
          update public.sessions
             set status = 'abandoned',
                 ended_at = now(),
                 release_reason = $1
           where id = $2
        `,
        [reason, row.id]
      );
      await client.query(
        `
          update public.desks
             set status = 'abandoned',
                 current_session_id = $1,
                 status_changed_at = now()
           where id = $2
        `,
        [row.id, row.desk_id]
      );
      await client.query(
        "update public.profiles set citizenship_score = greatest(citizenship_score - 8, 0) where id = $1",
        [row.user_id]
      );
      await client.query(
        `
          insert into public.audit_logs (actor_id, actor_role, action, desk_id, session_id, details)
          values ($1, 'system', 'desk_marked_abandoned', $2, $3, $4::jsonb)
        `,
        [row.user_id, row.desk_id, row.id, JSON.stringify({ reason, trigger })]
      );
      await client.query(
        `
          insert into public.notifications (user_id, title, body, type)
          values ($1, 'Desk released', $2, 'warning')
        `,
        [row.user_id, `${row.label} was released after the timer expired.`]
      );
    }

    const releasable = await client.query<{
      id: string;
      current_session_id: string | null;
      label: string;
    }>(
      `
        select id, current_session_id, label
          from public.desks
         where status = 'abandoned'
           and status_changed_at <= now() - ($1 * interval '1 second')
         for update
      `,
      [ABANDONED_RELEASE_SECONDS]
    );

    for (const row of releasable.rows) {
      await client.query(
        `
          update public.desks
             set status = 'free',
                 current_session_id = null,
                 status_changed_at = now()
           where id = $1
        `,
        [row.id]
      );
      await client.query(
        `
          insert into public.audit_logs (actor_role, action, desk_id, session_id, details)
          values ('system', 'desk_auto_released', $1, $2, $3::jsonb)
        `,
        [row.id, row.current_session_id, JSON.stringify({ trigger })]
      );
    }

    await client.query("select public.expire_qr_challenges()");

    await client.query("commit");
    return { skipped: false, abandoned: expired.rowCount ?? 0, released: releasable.rowCount ?? 0 };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    cleanupRunning = false;
  }
}

async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    demoMode: DEMO_MODE,
    timers: {
      sessionSeconds: SESSION_SECONDS,
      awaySeconds: AWAY_SECONDS,
      sweepSeconds: SWEEP_SECONDS,
      qrRotationSeconds: QR_ROTATION_SECONDS,
      qrTokenExpirySeconds: QR_TOKEN_EXPIRY_SECONDS
    }
  });
});

async function issueQrChallenge(client: PoolClient, displayId: string, baseUrl = APP_BASE_URL) {
  const { rows } = await client.query<{
    id: string;
    display_public_id: string;
    display_name: string;
    is_active: boolean;
    desk_id: string;
    code: string;
    label: string;
    floor: number;
    zone: string;
    status: string;
  }>(
    `
      select qd.id,
             qd.display_public_id,
             qd.display_name,
             qd.is_active,
             d.id as desk_id,
             d.code,
             d.label,
             d.floor,
             d.zone,
             d.status
        from public.desk_qr_displays qd
        join public.desks d on d.id = qd.desk_id
       where qd.id = $1
       for update of qd
    `,
    [displayId]
  );

  const display = rows[0];
  if (!display) {
    throw new HttpError(404, "QR display not found.");
  }
  if (!display.is_active) {
    throw new HttpError(403, "This QR display has been disabled.");
  }

  await client.query(
    `
      update public.desk_qr_challenges
         set revoked_at = now()
       where display_id = $1
         and used_at is null
         and revoked_at is null
    `,
    [display.id]
  );

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashQrToken(token);
  const challenge = await client.query<{ expires_at: string; issued_at: string }>(
    `
      insert into public.desk_qr_challenges (desk_id, display_id, token_hash, expires_at)
      values ($1, $2, $3, now() + ($4 * interval '1 second'))
      returning issued_at, expires_at
    `,
    [display.desk_id, display.id, tokenHash, QR_TOKEN_EXPIRY_SECONDS]
  );

  await client.query("update public.desk_qr_displays set last_seen_at = now() where id = $1", [display.id]);

  return {
    claim_url: claimUrlFor(token, baseUrl),
    expires_at: challenge.rows[0].expires_at,
    issued_at: challenge.rows[0].issued_at,
    rotation_seconds: QR_ROTATION_SECONDS,
    expiry_seconds: QR_TOKEN_EXPIRY_SECONDS,
    display: {
      id: display.id,
      display_public_id: display.display_public_id,
      display_name: display.display_name
    },
    desk: {
      id: display.desk_id,
      code: display.code,
      label: display.label,
      floor: display.floor,
      zone: display.zone,
      status: display.status
    }
  };
}

async function ensureDeskDisplay(client: PoolClient, deskId: string) {
  const deskResult = await client.query<{ id: string; code: string; label: string }>(
    "select id, code, label from public.desks where id = $1",
    [deskId]
  );
  const desk = deskResult.rows[0];
  if (!desk) {
    throw new HttpError(404, "Desk not found.");
  }

  const existing = await client.query<{ id: string }>(
    "select id from public.desk_qr_displays where desk_id = $1 order by created_at limit 1",
    [deskId]
  );

  if (existing.rows[0]) {
    return existing.rows[0].id;
  }

  const created = await client.query<{ id: string }>(
    `
      insert into public.desk_qr_displays (desk_id, display_public_id, display_name)
      values ($1, $2, $3)
      returning id
    `,
    [deskId, randomPublicId(desk.code), `${desk.label} Live Display`]
  );

  return created.rows[0].id;
}

app.get(
  "/api/display/:displayPublicId/issue-qr",
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query<{ id: string }>(
      "select id from public.desk_qr_displays where display_public_id = $1 limit 1",
      [req.params.displayPublicId]
    );

    if (!rows[0]) {
      throw new HttpError(404, "QR display not found.");
    }

    const baseUrl = cleanBaseUrl(req.query.baseUrl);
    const payload = await withTransaction((client) => issueQrChallenge(client, rows[0].id, baseUrl));
    res.json(payload);
  })
);

app.get(
  "/api/claim/preview",
  requireAuth,
  asyncHandler(async (req, res) => {
    const token = String(req.query.token ?? "").trim();
    if (!token) {
      throw new HttpError(400, "Missing QR claim token.");
    }

    const tokenHash = hashQrToken(token);
    const { rows } = await pool.query<{
      id: string;
      expires_at: string;
      used_at: string | null;
      revoked_at: string | null;
      desk_id: string;
      code: string;
      label: string;
      floor: number;
      zone: string;
      status: string;
    }>(
      `
        select c.id,
               c.expires_at,
               c.used_at,
               c.revoked_at,
               d.id as desk_id,
               d.code,
               d.label,
               d.floor,
               d.zone,
               d.status
          from public.desk_qr_challenges c
          join public.desks d on d.id = c.desk_id
         where c.token_hash = $1
         limit 1
      `,
      [tokenHash]
    );

    const challenge = rows[0];
    if (!challenge) {
      res.json({ status: "invalid" });
      return;
    }

    const expired = new Date(challenge.expires_at).getTime() <= Date.now();
    const status = challenge.used_at
      ? "used"
      : challenge.revoked_at
        ? "revoked"
        : expired
          ? "expired"
          : challenge.status !== "free"
            ? "desk_occupied"
            : "valid";

    res.json({
      status,
      expires_at: challenge.expires_at,
      desk: {
        id: challenge.desk_id,
        code: challenge.code,
        label: challenge.label,
        floor: challenge.floor,
        zone: challenge.zone,
        status: challenge.status
      }
    });
  })
);

app.post(
  "/api/claim",
  requireAuth,
  asyncHandler(async (req, res) => {
    const authed = req as AuthedRequest;
    requireStudent(authed);
    await runCleanup("qr_claim");

    const token = String(req.body?.token ?? "").trim();
    if (!token) {
      throw new HttpError(400, "Missing QR claim token.");
    }

    const tokenHash = hashQrToken(token);

    await withTransaction(async (client) => {
      const challengeResult = await client.query<{
        id: string;
        desk_id: string;
        expires_at: string;
        used_at: string | null;
        revoked_at: string | null;
      }>(
        `
          select id, desk_id, expires_at, used_at, revoked_at
            from public.desk_qr_challenges
           where token_hash = $1
           for update
        `,
        [tokenHash]
      );

      const challenge = challengeResult.rows[0];
      if (!challenge) {
        throw new HttpError(404, "This QR code is not valid. Please scan the latest QR code displayed at the desk.");
      }
      if (challenge.used_at) {
        throw new HttpError(409, "This QR code has already been used. Please scan the latest QR code displayed at the desk.");
      }
      if (challenge.revoked_at) {
        throw new HttpError(410, "This QR code was refreshed. Please scan the latest QR code displayed at the desk.");
      }
      if (new Date(challenge.expires_at).getTime() <= Date.now()) {
        throw new HttpError(410, "This QR code has expired. Please scan the new live QR code displayed at the desk.");
      }

      const existingSession = await client.query<{ id: string }>(
        "select id from public.sessions where user_id = $1 and status in ('active', 'away') limit 1",
        [authed.auth.id]
      );
      if (existingSession.rows[0]) {
        throw new HttpError(409, "You already have an active desk.");
      }

      const deskResult = await client.query<{ id: string; status: string; label: string }>(
        "select id, status, label from public.desks where id = $1 for update",
        [challenge.desk_id]
      );
      const desk = deskResult.rows[0];
      if (!desk) {
        throw new HttpError(404, "Desk not found.");
      }
      if (desk.status !== "free") {
        throw new HttpError(409, "This desk has already been claimed. Please choose another available desk.");
      }

      await client.query("update public.desk_qr_challenges set used_at = now() where id = $1", [challenge.id]);

      const sessionResult = await client.query<{ id: string }>(
        `
          insert into public.sessions (user_id, desk_id, status, active_expires_at, last_confirmed_at)
          values ($1, $2, 'active', now() + ($3 * interval '1 second'), now())
          returning id
        `,
        [authed.auth.id, desk.id, SESSION_SECONDS]
      );

      const session = sessionResult.rows[0];
      await client.query(
        `
          update public.desks
             set status = 'occupied',
                 current_session_id = $1,
                 status_changed_at = now()
           where id = $2
        `,
        [session.id, desk.id]
      );
      await client.query(
        `
          insert into public.audit_logs (actor_id, actor_role, action, desk_id, session_id, details)
          values ($1, 'student', 'desk_claimed_with_live_qr', $2, $3, $4::jsonb)
        `,
        [authed.auth.id, desk.id, session.id, JSON.stringify({ tokenHashPrefix: tokenHash.slice(0, 10) })]
      );
    });

    res.json(await buildState(authed.auth));
  })
);

app.get(
  "/api/desks/code/:code",
  requireAuth,
  asyncHandler(async (req, res) => {
    const code = req.params.code;
    const { rows } = await pool.query(
      `
        select id, code, label, floor, zone, x, y, width, height, status, features, is_accessible, status_changed_at
          from public.desks
         where lower(code) = lower($1)
         limit 1
      `,
      [code]
    );

    if (!rows[0]) {
      throw new HttpError(404, "Desk not found.");
    }

    res.json({ desk: rows[0] });
  })
);

app.post(
  "/api/librarian/qr-display/:deskId/issue",
  requireAuth,
  asyncHandler(async (req, res) => {
    const authed = req as AuthedRequest;
    requireStaff(authed);
    const baseUrl = cleanBaseUrl(req.body?.baseUrl);
    const payload = await withTransaction(async (client) => {
      const displayId = await ensureDeskDisplay(client, String(req.params.deskId));
      return issueQrChallenge(client, displayId, baseUrl);
    });
    res.json(payload);
  })
);

app.get(
  "/api/state",
  requireAuth,
  asyncHandler(async (req, res) => {
    await runCleanup("state_fetch");
    res.json(await buildState((req as AuthedRequest).auth));
  })
);

app.post(
  "/api/cleanup/run",
  requireAuth,
  asyncHandler(async (req, res) => {
    const authed = req as AuthedRequest;
    requireStaff(authed);
    const cleanup = await runCleanup("manual");
    res.json({ cleanup, state: await buildState(authed.auth) });
  })
);

app.post(
  "/api/check-in",
  requireAuth,
  asyncHandler(async (req, res) => {
    const authed = req as AuthedRequest;
    requireStudent(authed);
    await runCleanup("check_in");

    if (!QR_FALLBACK_MODE_ENABLED) {
      throw new HttpError(
        403,
        "Printed-code fallback is disabled. Scan the live rotating QR code displayed at the desk."
      );
    }

    const code = String(req.body?.code ?? "").trim();
    if (!code) {
      throw new HttpError(400, "Enter a desk code or scan a QR token.");
    }

    const { rows } = await pool.query<{ id: string }>(
      "select id from public.desks where lower(code) = lower($1) or qr_token = $1 limit 1",
      [code]
    );

    if (!rows[0]) {
      throw new HttpError(404, "That desk code was not found.");
    }

    const { error } = await supabase.rpc("check_in_desk", {
      p_user_id: authed.auth.id,
      p_desk_id: rows[0].id,
      p_demo: DEMO_MODE
    });

    if (error) {
      throw mapSupabaseActionError(error.message);
    }

    res.json(await buildState(authed.auth));
  })
);

app.post(
  "/api/desks/:deskId/check-in",
  requireAuth,
  asyncHandler(async (req, res) => {
    const authed = req as AuthedRequest;
    requireStudent(authed);
    await runCleanup("check_in");

    if (!QR_FALLBACK_MODE_ENABLED) {
      throw new HttpError(
        403,
        "Printed-code fallback is disabled. Scan the live rotating QR code displayed at the desk."
      );
    }

    const { error } = await supabase.rpc("check_in_desk", {
      p_user_id: authed.auth.id,
      p_desk_id: req.params.deskId,
      p_demo: DEMO_MODE
    });

    if (error) {
      throw mapSupabaseActionError(error.message);
    }

    res.json(await buildState(authed.auth));
  })
);

app.post(
  "/api/sessions/:sessionId/away",
  requireAuth,
  asyncHandler(async (req, res) => {
    const authed = req as AuthedRequest;
    requireStudent(authed);
    await runCleanup("away");

    await withTransaction(async (client) => {
      const { rows } = await client.query<{ id: string; desk_id: string }>(
        `
          select id, desk_id
            from public.sessions
           where id = $1
             and user_id = $2
             and status = 'active'
           for update
        `,
        [req.params.sessionId, authed.auth.id]
      );

      const session = rows[0];
      if (!session) {
        throw new HttpError(409, "Only an active session can enter Away Mode.");
      }

      await client.query(
        `
          update public.sessions
             set status = 'away',
                 away_started_at = now(),
                 away_expires_at = now() + ($1 * interval '1 second')
           where id = $2
        `,
        [AWAY_SECONDS, session.id]
      );
      await client.query(
        "update public.desks set status = 'away', status_changed_at = now() where id = $1",
        [session.desk_id]
      );
      await client.query(
        `
          insert into public.audit_logs (actor_id, actor_role, action, desk_id, session_id, details)
          values ($1, 'student', 'session_away_started', $2, $3, $4::jsonb)
        `,
        [authed.auth.id, session.desk_id, session.id, JSON.stringify({ awaySeconds: AWAY_SECONDS })]
      );
    });

    res.json(await buildState(authed.auth));
  })
);

app.post(
  "/api/sessions/:sessionId/resume",
  requireAuth,
  asyncHandler(async (req, res) => {
    const authed = req as AuthedRequest;
    requireStudent(authed);
    await runCleanup("resume");

    await withTransaction(async (client) => {
      const { rows } = await client.query<{ id: string; desk_id: string; away_expired: boolean }>(
        `
          select id, desk_id, away_expires_at <= now() as away_expired
            from public.sessions
           where id = $1
             and user_id = $2
             and status = 'away'
           for update
        `,
        [req.params.sessionId, authed.auth.id]
      );

      const session = rows[0];
      if (!session) {
        throw new HttpError(409, "No active Away Mode session was found.");
      }

      if (session.away_expired) {
        throw new HttpError(409, "Away Mode expired. The cleanup sweep will release this desk.");
      }

      await client.query(
        `
          update public.sessions
             set status = 'active',
                 away_started_at = null,
                 away_expires_at = null,
                 active_expires_at = now() + ($1 * interval '1 second'),
                 last_confirmed_at = now()
           where id = $2
        `,
        [SESSION_SECONDS, session.id]
      );
      await client.query(
        "update public.desks set status = 'occupied', status_changed_at = now() where id = $1",
        [session.desk_id]
      );
      await client.query(
        `
          insert into public.audit_logs (actor_id, actor_role, action, desk_id, session_id)
          values ($1, 'student', 'session_resumed', $2, $3)
        `,
        [authed.auth.id, session.desk_id, session.id]
      );
    });

    res.json(await buildState(authed.auth));
  })
);

app.post(
  "/api/sessions/:sessionId/confirm-presence",
  requireAuth,
  asyncHandler(async (req, res) => {
    const authed = req as AuthedRequest;
    requireStudent(authed);
    await runCleanup("confirm_presence");

    await withTransaction(async (client) => {
      const { rows } = await client.query<{ id: string; desk_id: string }>(
        `
          select id, desk_id
            from public.sessions
           where id = $1
             and user_id = $2
             and status = 'active'
           for update
        `,
        [req.params.sessionId, authed.auth.id]
      );

      const session = rows[0];
      if (!session) {
        throw new HttpError(409, "No active session can be confirmed.");
      }

      await client.query(
        `
          update public.sessions
             set active_expires_at = now() + ($1 * interval '1 second'),
                 last_confirmed_at = now()
           where id = $2
        `,
        [SESSION_SECONDS, session.id]
      );
      await client.query(
        "update public.profiles set citizenship_score = least(citizenship_score + 1, 100) where id = $1",
        [authed.auth.id]
      );
      await client.query(
        `
          insert into public.audit_logs (actor_id, actor_role, action, desk_id, session_id, details)
          values ($1, 'student', 'presence_confirmed', $2, $3, $4::jsonb)
        `,
        [authed.auth.id, session.desk_id, session.id, JSON.stringify({ extendedSeconds: SESSION_SECONDS })]
      );
    });

    res.json(await buildState(authed.auth));
  })
);

app.post(
  "/api/sessions/:sessionId/release",
  requireAuth,
  asyncHandler(async (req, res) => {
    const authed = req as AuthedRequest;
    requireStudent(authed);

    await withTransaction(async (client) => {
      const { rows } = await client.query<{ id: string; desk_id: string }>(
        `
          select id, desk_id
            from public.sessions
           where id = $1
             and user_id = $2
             and status in ('active', 'away')
           for update
        `,
        [req.params.sessionId, authed.auth.id]
      );

      const session = rows[0];
      if (!session) {
        throw new HttpError(409, "No releasable session was found.");
      }

      await client.query(
        `
          update public.sessions
             set status = 'ended',
                 ended_at = now(),
                 release_reason = 'voluntary'
           where id = $1
        `,
        [session.id]
      );
      await client.query(
        `
          update public.desks
             set status = 'free',
                 current_session_id = null,
                 status_changed_at = now()
           where id = $1
        `,
        [session.desk_id]
      );
      await client.query(
        "update public.profiles set citizenship_score = least(citizenship_score + 2, 100) where id = $1",
        [authed.auth.id]
      );
      await client.query(
        `
          insert into public.audit_logs (actor_id, actor_role, action, desk_id, session_id)
          values ($1, 'student', 'desk_released_voluntarily', $2, $3)
        `,
        [authed.auth.id, session.desk_id, session.id]
      );
    });

    res.json(await buildState(authed.auth));
  })
);

app.post(
  "/api/librarian/desks/:deskId/reset",
  requireAuth,
  asyncHandler(async (req, res) => {
    const authed = req as AuthedRequest;
    requireStaff(authed);

    await withTransaction(async (client) => {
      const { rows } = await client.query<{ id: string; current_session_id: string | null }>(
        "select id, current_session_id from public.desks where id = $1 for update",
        [req.params.deskId]
      );

      const desk = rows[0];
      if (!desk) {
        throw new HttpError(404, "Desk not found.");
      }

      if (desk.current_session_id) {
        await client.query(
          `
            update public.sessions
               set status = case when status in ('active', 'away') then 'ended'::public.session_status else status end,
                   ended_at = coalesce(ended_at, now()),
                   release_reason = coalesce(release_reason, 'librarian_reset')
             where id = $1
          `,
          [desk.current_session_id]
        );
      }

      await client.query(
        `
          update public.desks
             set status = 'free',
                 current_session_id = null,
                 status_changed_at = now()
           where id = $1
        `,
        [desk.id]
      );
      await client.query(
        `
          insert into public.audit_logs (actor_id, actor_role, action, desk_id, session_id)
          values ($1, $2, 'desk_reset_by_librarian', $3, $4)
        `,
        [authed.auth.id, authed.auth.profile.role, desk.id, desk.current_session_id]
      );
    });

    res.json(await buildState(authed.auth));
  })
);

app.patch(
  "/api/librarian/desks/:deskId/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const authed = req as AuthedRequest;
    requireStaff(authed);

    const status = String(req.body?.status ?? "");
    if (!["free", "unavailable"].includes(status)) {
      throw new HttpError(400, "Librarians can restore a desk or mark it unavailable.");
    }

    await withTransaction(async (client) => {
      const { rows } = await client.query<{ id: string; current_session_id: string | null; status: string }>(
        "select id, status, current_session_id from public.desks where id = $1 for update",
        [req.params.deskId]
      );

      const desk = rows[0];
      if (!desk) {
        throw new HttpError(404, "Desk not found.");
      }

      if (status === "unavailable" && desk.current_session_id) {
        await client.query(
          `
            update public.sessions
               set status = case when status in ('active', 'away') then 'ended'::public.session_status else status end,
                   ended_at = coalesce(ended_at, now()),
                   release_reason = coalesce(release_reason, 'maintenance')
             where id = $1
          `,
          [desk.current_session_id]
        );
      }

      await client.query(
        `
          update public.desks
             set status = $1::public.desk_status,
                 current_session_id = case when $1 = 'free' then null else current_session_id end,
                 status_changed_at = now()
           where id = $2
        `,
        [status, desk.id]
      );
      await client.query(
        `
          insert into public.audit_logs (actor_id, actor_role, action, desk_id, session_id, details)
          values ($1, $2, $3, $4, $5, $6::jsonb)
        `,
        [
          authed.auth.id,
          authed.auth.profile.role,
          status === "unavailable" ? "desk_marked_unavailable" : "desk_restored",
          desk.id,
          desk.current_session_id,
          JSON.stringify({ from: desk.status, to: status })
        ]
      );
    });

    res.json(await buildState(authed.auth));
  })
);

function mapSupabaseActionError(message: string) {
  if (message.includes("ALREADY_ACTIVE")) {
    return new HttpError(409, "You already have an active desk.");
  }
  if (message.includes("DESK_NOT_FREE")) {
    return new HttpError(409, "That desk is not free anymore.");
  }
  if (message.includes("DESK_NOT_FOUND")) {
    return new HttpError(404, "Desk not found.");
  }
  return new HttpError(400, message);
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  if (status >= 500) {
    console.error(error);
  }
  res.status(status).json({ error: message });
});

const port = intEnv("API_PORT", 8787);
if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
  app.listen(port, () => {
    console.log(`DeskGuard API listening on http://localhost:${port}`);
    runCleanup("startup").catch((error) => console.error("Startup cleanup failed", error));
    setInterval(() => {
      runCleanup("interval").catch((error) => console.error("Cleanup sweep failed", error));
    }, SWEEP_SECONDS * 1000);
  });
}

export default app;
