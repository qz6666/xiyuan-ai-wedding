import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workspaceRecords = sqliteTable("workspace_records", {
  scopeId: text("scope_id").primaryKey(),
  ownerId: text("owner_id"),
  envelope: text("envelope").notNull(),
  checksum: text("checksum").notNull(),
  version: integer("version").notNull().default(2),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const guestInvitations = sqliteTable(
  "guest_invitations",
  {
    code: text("code").primaryKey(),
    scopeId: text("scope_id").notNull(),
    workspaceKey: text("workspace_key").notNull(),
    ownerId: text("owner_id"),
    guestId: integer("guest_id").notNull(),
    guestName: text("guest_name").notNull(),
    relation: text("relation").notNull(),
    invitedCount: integer("invited_count").notNull().default(1),
    coupleNames: text("couple_names").notNull(),
    weddingDate: text("wedding_date").notNull(),
    city: text("city").notNull(),
    rsvp: text("rsvp").notNull().default("待确认"),
    attendingCount: integer("attending_count").notNull().default(1),
    companion: integer("companion", { mode: "boolean" }).notNull().default(false),
    dietary: text("dietary").notNull().default(""),
    message: text("message").notNull().default(""),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    respondedAt: text("responded_at"),
  },
  (table) => [
    index("guest_invitations_scope_guest_idx").on(
      table.scopeId,
      table.guestId,
    ),
  ],
);

export const privacyConsents = sqliteTable("privacy_consents", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  termsVersion: text("terms_version").notNull(),
  privacyVersion: text("privacy_version").notNull(),
  acceptedAt: text("accepted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  source: text("source").notNull().default("web"),
});

export const accountDeletions = sqliteTable(
  "account_deletions",
  {
    userId: text("user_id").primaryKey(),
    email: text("email").notNull(),
    requestedAt: text("requested_at").notNull(),
    scheduledFor: text("scheduled_for").notNull(),
    status: text("status").notNull().default("pending"),
  },
  (table) => [
    index("account_deletions_status_idx").on(
      table.status,
      table.scheduledFor,
    ),
  ],
);
