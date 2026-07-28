import nextConfig from '../../next.config';
import packageJson from '../../package.json';
import packageLock from '../../package-lock.json';

const REVIEWED_NEXT_PATCH = '16.2.12';
const packages = packageLock.packages as Record<string, {
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}>;

describe('reviewed Next.js security patch', () => {
  it('pins the framework and lint config coherently', () => {
    expect(packageJson.dependencies.next).toBe(REVIEWED_NEXT_PATCH);
    expect(packageJson.devDependencies['eslint-config-next']).toBe(REVIEWED_NEXT_PATCH);
    expect(packages[''].dependencies?.next).toBe(REVIEWED_NEXT_PATCH);
    expect(packages[''].devDependencies?.['eslint-config-next']).toBe(REVIEWED_NEXT_PATCH);
    expect(packages['node_modules/next'].version).toBe(REVIEWED_NEXT_PATCH);
    expect(packages['node_modules/eslint-config-next'].version).toBe(REVIEWED_NEXT_PATCH);
    expect(packages['node_modules/@next/env'].version).toBe(REVIEWED_NEXT_PATCH);
    expect(packages['node_modules/@next/eslint-plugin-next'].version).toBe(REVIEWED_NEXT_PATCH);
    const swcVersions = Object.entries(packages)
      .filter(([packagePath]) => packagePath.startsWith('node_modules/@next/swc-'))
      .map(([, metadata]) => metadata.version);
    expect(swcVersions.length).toBeGreaterThan(0);
    expect(new Set(swcVersions)).toEqual(new Set([REVIEWED_NEXT_PATCH]));
  });

  it('preserves the reviewed React and transitive sharp boundary', () => {
    expect(packageJson.dependencies.react).toBe('19.2.3');
    expect(packageJson.dependencies['react-dom']).toBe('19.2.3');
    expect(packageJson.dependencies).not.toHaveProperty('sharp');
    expect(packageJson.overrides).not.toHaveProperty('sharp');
    expect(packages['node_modules/next'].optionalDependencies?.sharp).toBe('^0.34.5');
    expect(packages['node_modules/sharp'].version).toBe('0.34.5');
  });

  it('disables the unused image-optimization surface', () => {
    expect(nextConfig.images?.unoptimized).toBe(true);
  });
});
