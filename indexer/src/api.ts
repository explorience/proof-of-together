/**
 * PRUEBA Indexer — REST API
 *
 * Endpoints:
 *   GET /api/health
 *   GET /api/communities
 *   GET /api/communities/:entityId
 *   GET /api/communities/:entityId/sessions?page=1&limit=20
 *   GET /api/communities/:entityId/decisions?page=1&limit=20
 *   GET /api/communities/:entityId/stats
 *   GET /api/attestations/:uid
 */

import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import {
  getAllCommunities,
  getCommunity,
  getAttestation,
  getAttestationsByEntity,
  countAttestationsByEntity,
  getMeta,
} from "./db.js";
import { config } from "./config.js";

// ─── Helpers ──────────────────────────────────────────────────────────────

function parsePagination(query: Request["query"]): { page: number; limit: number; offset: number } {
  const pageStr  = Array.isArray(query.page)  ? String(query.page[0])  : String(query.page  || "1");
  const limitStr = Array.isArray(query.limit) ? String(query.limit[0]) : String(query.limit || "20");
  const page  = Math.max(1, parseInt(pageStr,  10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(limitStr, 10) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function ok(res: Response, data: unknown, meta?: Record<string, unknown>): void {
  res.json({ ok: true, data, ...meta });
}

function notFound(res: Response, message = "Not found"): void {
  res.status(404).json({ ok: false, error: message });
}

// ─── App factory ──────────────────────────────────────────────────────────

export function createApp(): express.Express {
  const app = express();

  // ── Middleware ──────────────────────────────────────────────────────────
  app.use(cors());
  app.use(express.json());

  // Request logger (lightweight)
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[api] ${req.method} ${req.path}`);
    next();
  });

  // ── Routes ──────────────────────────────────────────────────────────────

  /**
   * GET /api/health
   * Returns indexer health: status, last indexed block, schema config.
   */
  app.get("/api/health", (_req: Request, res: Response) => {
    const lastBlock = getMeta("last_block");
    ok(res, {
      status: "ok",
      last_block: lastBlock ? parseInt(lastBlock, 10) : null,
      schemas_configured: {
        activity:   Boolean(config.ACTIVITY_SCHEMA_UID),
        governance: Boolean(config.GOVERNANCE_SCHEMA_UID),
      },
      uptime_seconds: Math.floor(process.uptime()),
    });
  });

  /**
   * GET /api/communities
   * Returns all indexed communities, sorted by total_sessions desc.
   */
  app.get("/api/communities", (_req: Request, res: Response) => {
    const communities = getAllCommunities();
    ok(res, communities, { total: communities.length });
  });

  /**
   * GET /api/communities/:entityId
   * Returns a single community by entityId.
   */
  app.get("/api/communities/:entityId", (req: Request<{ entityId: string }>, res: Response) => {
    const entityId = String(req.params.entityId);
    const community = getCommunity(entityId);
    if (!community) return notFound(res, `Community '${entityId}' not found`);
    ok(res, community);
  });

  /**
   * GET /api/communities/:entityId/sessions?page=1&limit=20
   * Returns paginated activity attestations for a community.
   */
  app.get("/api/communities/:entityId/sessions", (req: Request<{ entityId: string }>, res: Response) => {
    const entityId = String(req.params.entityId);
    const { page, limit, offset } = parsePagination(req.query);

    const community = getCommunity(entityId);
    if (!community) return notFound(res, `Community '${entityId}' not found`);

    const items = getAttestationsByEntity(entityId, "activity", limit, offset);
    const total = countAttestationsByEntity(entityId, "activity");

    ok(res, items, {
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: offset + limit < total,
      },
    });
  });

  /**
   * GET /api/communities/:entityId/decisions?page=1&limit=20
   * Returns paginated governance attestations for a community.
   */
  app.get("/api/communities/:entityId/decisions", (req: Request<{ entityId: string }>, res: Response) => {
    const entityId = String(req.params.entityId);
    const { page, limit, offset } = parsePagination(req.query);

    const community = getCommunity(entityId);
    if (!community) return notFound(res, `Community '${entityId}' not found`);

    const items = getAttestationsByEntity(entityId, "governance", limit, offset);
    const total = countAttestationsByEntity(entityId, "governance");

    ok(res, items, {
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_next: offset + limit < total,
      },
    });
  });

  /**
   * GET /api/communities/:entityId/stats
   * Returns aggregated stats for a community.
   */
  app.get("/api/communities/:entityId/stats", (req: Request<{ entityId: string }>, res: Response) => {
    const entityId = String(req.params.entityId);

    const community = getCommunity(entityId);
    if (!community) return notFound(res, `Community '${entityId}' not found`);

    ok(res, {
      entity_id:          community.entity_id,
      name:               community.name,
      total_sessions:     community.total_sessions,
      total_decisions:    community.total_decisions,
      total_participants: community.total_participants,
      first_attestation:  community.created_at,
    });
  });

  /**
   * GET /api/attestations/:uid
   * Returns a single attestation by its EAS UID.
   */
  app.get("/api/attestations/:uid", (req: Request<{ uid: string }>, res: Response) => {
    const attestation = getAttestation(String(req.params.uid));
    if (!attestation) return notFound(res, `Attestation '${req.params.uid}' not found`);

    // Parse metadata_json for richer response
    let metadata: unknown = null;
    if (attestation.metadata_json) {
      try {
        metadata = JSON.parse(attestation.metadata_json);
      } catch {
        // ignore — return raw string
        metadata = attestation.metadata_json;
      }
    }

    ok(res, { ...attestation, metadata_json: undefined, metadata });
  });

  // ── 404 catch-all ───────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    notFound(res, "Endpoint not found");
  });

  // ── Error handler ───────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[api] Unhandled error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  });

  return app;
}

export function startApi(): { close: () => Promise<void> } {
  const app = createApp();

  const server = app.listen(config.API_PORT, () => {
    console.log(`[api] Listening on port ${config.API_PORT}`);
  });

  return {
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
