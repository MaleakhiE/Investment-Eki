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
