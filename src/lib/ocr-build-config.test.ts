import nextConfig from '../../next.config';
import packageJson from '../../package.json';

describe('OCR production bundle', () => {
  it('includes the dynamically required Tesseract core assets in the OCR route trace', () => {
    expect(nextConfig.serverExternalPackages).toContain('tesseract.js');
    expect(nextConfig.outputFileTracingIncludes?.['/api/transactions/ocr-scan'])
      .toEqual(expect.arrayContaining([
        './node_modules/tesseract.js/**/*',
        './node_modules/tesseract.js-core/**/*',
        './node_modules/wasm-feature-detect/**/*',
        './node_modules/regenerator-runtime/**/*',
        './node_modules/is-url/**/*',
        './node_modules/node-fetch/**/*',
        './node_modules/bmp-js/**/*',
      ]));
  });

  it('verifies the generated OCR function trace during every production build', () => {
    expect(packageJson.scripts.build).toContain('node scripts/verify-ocr-build-trace.js');
  });
});

describe('Next.js production hardening', () => {
  it('uses the repository root for Turbopack and output tracing', () => {
    expect(nextConfig.turbopack?.root).toBe(process.cwd());
    expect(nextConfig.outputFileTracingRoot).toBe(process.cwd());
  });

  it('sets baseline security headers on every route', async () => {
    const rules = await nextConfig.headers?.();
    const globalRule = rules?.find(rule => rule.source === '/(.*)');

    expect(globalRule?.headers).toEqual(expect.arrayContaining([
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      expect.objectContaining({ key: 'Content-Security-Policy' }),
    ]));

    expect(rules).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: '/reset-password',
        headers: expect.arrayContaining([{ key: 'Referrer-Policy', value: 'no-referrer' }]),
      }),
    ]));
  });
});
