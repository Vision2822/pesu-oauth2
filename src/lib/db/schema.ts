import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  jsonb,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    pesuprn: varchar("pesuprn", { length: 80 }).notNull(),
    profileData: jsonb("profile_data"),
  },
  (table) => [uniqueIndex("users_pesuprn_idx").on(table.pesuprn)]
);

export const oauth2Clients = pgTable(
  "oauth2_clients",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: varchar("client_id", { length: 48 }).notNull(),
    clientSecret: varchar("client_secret", { length: 255 }),
    clientName: varchar("client_name", { length: 200 }).notNull(),
    redirectUris: jsonb("redirect_uris").notNull().$type<string[]>(),
    scope: text("scope").notNull(),
    tokenEndpointAuthMethod: varchar("token_endpoint_auth_method", {
      length: 20,
    })
      .notNull()
      .default("none"),
    grantTypes: jsonb("grant_types")
      .notNull()
      .$type<string[]>()
      .default(["authorization_code", "refresh_token"]),
    responseTypes: jsonb("response_types")
      .notNull()
      .$type<string[]>()
      .default(["code"]),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(() => Math.floor(Date.now() / 1000)),
  },
  (table) => [uniqueIndex("oauth2_clients_client_id_idx").on(table.clientId)]
);

export const oauth2AuthorizationCodes = pgTable(
  "oauth2_authorization_codes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: varchar("client_id", { length: 48 }).notNull(),
    code: varchar("code", { length: 120 }).notNull(),
    redirectUri: text("redirect_uri"),
    scope: text("scope"),
    codeChallenge: text("code_challenge"),
    codeChallengeMethod: varchar("code_challenge_method", { length: 10 }),
    grantedFields: jsonb("granted_fields").$type<
      Record<string, string[]>
    >(),
    expiresAt: integer("expires_at").notNull(),
    used: boolean("used").notNull().default(false),
  },
  (table) => [uniqueIndex("oauth2_auth_codes_code_idx").on(table.code)]
);

export const oauth2Tokens = pgTable(
  "oauth2_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clientId: varchar("client_id", { length: 48 }).notNull(),
    tokenType: varchar("token_type", { length: 40 })
      .notNull()
      .default("Bearer"),
    accessToken: varchar("access_token", { length: 255 }).notNull(),
    refreshToken: varchar("refresh_token", { length: 255 }),
    scope: text("scope"),
    grantedFields: jsonb("granted_fields").$type<
      Record<string, string[]>
    >(),
    issuedAt: integer("issued_at")
      .notNull()
      .$defaultFn(() => Math.floor(Date.now() / 1000)),
    expiresIn: integer("expires_in").notNull().default(3600),
    revoked: boolean("revoked").notNull().default(false),
  },
  (table) => [
    uniqueIndex("oauth2_tokens_access_token_idx").on(table.accessToken),
    index("oauth2_tokens_refresh_token_idx").on(table.refreshToken),
  ]
);