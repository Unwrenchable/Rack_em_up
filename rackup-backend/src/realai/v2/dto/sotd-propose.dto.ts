import { Allow, Equals } from 'class-validator';

/**
 * Incoming RealAI SotdProposeEnvelope (schema 1.0).
 * Nested map/catalog are allowed through and checked by the pure ingest helper.
 */
export class SotdProposeEnvelopeDto {
  @Equals('1.0')
  schema_version!: '1.0';

  @Allow()
  map!: Record<string, unknown>;

  @Allow()
  catalog!: Record<string, unknown>;

  @Allow()
  validation!: { ok: boolean; flags?: unknown };
}
