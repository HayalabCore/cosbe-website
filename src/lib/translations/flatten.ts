/**
 * Flatten nested message objects (string leaves only) to dot-path rows.
 * String arrays become paths like `foo.0`, `foo.1` for round-trip with JSON.
 */

export type FlatTranslationRow = { keyPath: string; value: string };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** First segment of a dot path (used as namespace for admin tabs). */
export function namespaceFromKeyPath(keyPath: string): string {
  const i = keyPath.indexOf('.');
  return i === -1 ? keyPath : keyPath.slice(0, i);
}

/**
 * Walk nested objects and string arrays; emit one row per leaf string.
 */
export function flattenMessages(
  obj: unknown,
  prefix = ''
): FlatTranslationRow[] {
  if (typeof obj === 'string') {
    if (!prefix) {
      throw new Error('Root message bundle cannot be a bare string');
    }
    return [{ keyPath: prefix, value: obj }];
  }

  if (Array.isArray(obj)) {
    if (!prefix) {
      throw new Error('Root message bundle cannot be a bare array');
    }
    return obj.flatMap((item, idx) =>
      flattenMessages(item, `${prefix}.${idx}`)
    );
  }

  if (isPlainObject(obj)) {
    return Object.entries(obj).flatMap(([k, v]) => {
      const next = prefix ? `${prefix}.${k}` : k;
      return flattenMessages(v, next);
    });
  }

  throw new Error(
    `Unsupported JSON value at "${prefix || '(root)'}": ${typeof obj}`
  );
}

function isArrayIndexSegment(segment: string): boolean {
  return /^\d+$/.test(segment);
}

/**
 * Create empty child container: array if next path segment is numeric, else object.
 */
function createChildContainer(
  nextSegment: string | undefined
): unknown[] | Record<string, unknown> {
  if (nextSegment !== undefined && isArrayIndexSegment(nextSegment)) {
    return [];
  }
  return {};
}

/**
 * Navigate to or create the container at `segment` under `parent`.
 */
function navigateToChild(
  parent: unknown,
  segment: string,
  nextSegment: string | undefined
): unknown {
  if (Array.isArray(parent)) {
    const idx = Number(segment);
    if (!Number.isInteger(idx) || idx < 0) {
      throw new Error(`Invalid array index in path: ${segment}`);
    }
    while (parent.length <= idx) {
      parent.push(undefined);
    }
    if (parent[idx] === undefined) {
      parent[idx] = createChildContainer(nextSegment);
    }
    return parent[idx] as unknown;
  }

  if (!isPlainObject(parent)) {
    throw new Error('Expected object or array parent while unflattening');
  }

  if (!(segment in parent) || parent[segment] === undefined) {
    parent[segment] = createChildContainer(nextSegment);
  }
  return parent[segment] as unknown;
}

/**
 * Rebuild nested messages from flat rows (inverse of flattenMessages).
 */
export function unflattenMessages(
  rows: Pick<FlatTranslationRow, 'keyPath' | 'value'>[]
): Record<string, unknown> {
  const root: Record<string, unknown> = {};

  for (const { keyPath, value } of rows) {
    const parts = keyPath.split('.').filter((p) => p.length > 0);
    if (parts.length === 0) {
      throw new Error('Empty keyPath');
    }

    let current: unknown = root;

    for (let i = 0; i < parts.length; i++) {
      const segment = parts[i]!;
      const isLast = i === parts.length - 1;
      const nextSegment = parts[i + 1];

      if (isLast) {
        if (Array.isArray(current)) {
          const idx = Number(segment);
          if (!isArrayIndexSegment(segment)) {
            throw new Error(
              `Array parent requires numeric segment, got "${segment}" in ${keyPath}`
            );
          }
          while (current.length <= idx) {
            current.push(undefined);
          }
          current[idx] = value;
        } else if (isPlainObject(current)) {
          current[segment] = value;
        } else {
          throw new Error(`Cannot assign leaf at ${keyPath}`);
        }
        break;
      }

      const child = navigateToChild(current, segment, nextSegment);
      current = child;
    }
  }

  return root;
}
