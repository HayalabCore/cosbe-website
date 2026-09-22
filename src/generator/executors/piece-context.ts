import { z } from 'zod';
import { NonRetryableRunError } from '../runs/run-types';
import { isLocked } from '../pieces/stages';
import { getPiece, getTemplate, readPiece, type PieceData } from '../pieces/pieces-repository';

export async function loadPiece(pieceId: string | null): Promise<PieceData> {
  if (!pieceId) throw new NonRetryableRunError('The run has no piece.');
  const row = await getPiece(pieceId);
  if (!row) throw new NonRetryableRunError('The piece no longer exists.');
  const piece = readPiece(row);
  if (isLocked(piece.stage)) throw new NonRetryableRunError('The piece was already handed off.');
  return piece;
}

export async function loadTemplate(piece: PieceData) {
  return piece.templateId ? getTemplate(piece.templateId) : null;
}

/** Zod failures are bad input, not transient — never retry. */
export function parseRunInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw new NonRetryableRunError('Invalid run input.');
  return parsed.data;
}
