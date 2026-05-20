import { describe, expect, it } from 'vitest';

import { buildPath, parseRoute } from './router';

describe('router', () => {
  it('parses the admin console route separately from the home route', () => {
    expect(parseRoute('/admin')).toEqual({ kind: 'admin' });
    expect(parseRoute('/admin/')).toEqual({ kind: 'admin' });
  });

  it('builds the admin console path', () => {
    expect(buildPath({ kind: 'admin' })).toBe('/admin');
  });
});
