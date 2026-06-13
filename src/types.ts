export type DeskStatus = "free" | "occupied" | "away" | "abandoned" | "unavailable";
export type SessionStatus = "active" | "away" | "ended" | "abandoned";
export type UserRole = "student" | "librarian" | "admin";

export type Desk = {
  id: string;
  code: string;
  label: string;
  floor: number;
  zone: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: DeskStatus;
  qr_token?: string;
  features: string[];
  is_accessible: boolean;
  current_session_id: string | null;
  status_changed_at: string;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  citizenship_score: number;
};

export type SessionRecord = {
  id: string;
  user_id: string;
  desk_id: string;
  status: SessionStatus;
  started_at: string;
  active_expires_at: string | null;
  away_started_at: string | null;
  away_expires_at: string | null;
  last_confirmed_at: string | null;
  ended_at: string | null;
  release_reason: string | null;
  created_at: string;
  updated_at: string;
  desk?: Desk;
  desks?: Desk;
  profile?: Profile;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  actor_role: string;
  action: string;
  desk_id: string | null;
  session_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
  desk?: Pick<Desk, "id" | "label" | "code" | "floor" | "zone" | "status">;
  desks?: Pick<Desk, "id" | "label" | "code" | "floor" | "zone" | "status">;
};

export type NotificationItem = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: string;
  read_at: string | null;
  created_at: string;
};

export type RuntimeConfig = {
  demoMode: boolean;
  sessionSeconds: number;
  awaySeconds: number;
  warningSeconds: number;
  sweepSeconds: number;
  abandonedReleaseSeconds: number;
  qrRotationSeconds: number;
  qrTokenExpirySeconds: number;
  qrTokenGraceSeconds: number;
  qrFallbackModeEnabled: boolean;
};

export type QRDisplay = {
  id: string;
  desk_id: string;
  display_public_id: string;
  display_name: string;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
  desk?: Pick<Desk, "id" | "code" | "label" | "floor" | "zone" | "status">;
  desks?: Pick<Desk, "id" | "code" | "label" | "floor" | "zone" | "status">;
};

export type AppState = {
  config: RuntimeConfig;
  profile: Profile;
  desks: Desk[];
  activeSession: SessionRecord | null;
  notifications: NotificationItem[];
  sessions: SessionRecord[];
  auditLogs: AuditLog[];
  profiles: Profile[];
  qrDisplays: QRDisplay[];
};

export type IssuedQR = {
  claim_url: string;
  expires_at: string;
  issued_at: string;
  rotation_seconds: number;
  expiry_seconds: number;
  display: {
    id: string;
    display_public_id: string;
    display_name: string;
  };
  desk: Pick<Desk, "id" | "code" | "label" | "floor" | "zone" | "status">;
};

export type ClaimPreview = {
  status: "valid" | "invalid" | "expired" | "used" | "revoked" | "desk_occupied";
  expires_at?: string;
  desk?: Pick<Desk, "id" | "code" | "label" | "floor" | "zone" | "status">;
};
