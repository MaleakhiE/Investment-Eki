import packageJson from '../../package.json';
import fs from 'node:fs';
import path from 'node:path';
import prismaConfig from '../../prisma.config';

describe('Prisma CLI configuration', () => {
  it('configures the schema and seed command outside package.json', () => {
    expect(packageJson).not.toHaveProperty('prisma');
    expect(prismaConfig.schema).toBe('prisma/schema.prisma');
    expect(prismaConfig.migrations?.seed).toBe(
      'tsx prisma/seed.ts',
    );
  });

  it('invokes the local Prisma CLI without a shell', () => {
    const wrapper = fs.readFileSync(path.join(process.cwd(), 'scripts/prisma-with-url.js'), 'utf8');
    expect(wrapper).toContain("spawn(process.execPath, [prismaCli, ...args]");
    expect(wrapper).toContain('shell: false');
    expect(wrapper).not.toContain('shell: true');
  });

  it('makes project-local seed executables available to Prisma', () => {
    const wrapper = fs.readFileSync(path.join(process.cwd(), 'scripts/prisma-with-url.js'), 'utf8');
    expect(wrapper).toContain("'node_modules', '.bin'");
    expect(wrapper).toContain('path.delimiter');
    expect(wrapper).toContain('env: childEnv');
  });
});
