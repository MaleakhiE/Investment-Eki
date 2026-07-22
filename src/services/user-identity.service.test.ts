import { ensureUserPublicId } from './user-identity.service';

const EXISTING_PUBLIC_ID = '3d594650-3436-4aa2-bb39-9fc9f5bc521d';
const CONCURRENT_PUBLIC_ID = '6f29d888-c175-45ff-818d-0d36c0f3fb54';

function createRepository() {
  return {
    updateMany: jest.fn(),
    findUnique: jest.fn(),
  };
}

describe('ensureUserPublicId', () => {
  it('returns an existing public ID without writing to the database', async () => {
    const repository = createRepository();

    await expect(ensureUserPublicId(
      { id: BigInt(1), public_id: EXISTING_PUBLIC_ID },
      repository,
    )).resolves.toBe(EXISTING_PUBLIC_ID);

    expect(repository.updateMany).not.toHaveBeenCalled();
    expect(repository.findUnique).not.toHaveBeenCalled();
  });

  it('atomically assigns a UUID v4 when the public ID is missing', async () => {
    const repository = createRepository();
    repository.updateMany.mockResolvedValue({ count: 1 });

    const publicId = await ensureUserPublicId(
      { id: BigInt(2), public_id: null },
      repository,
    );

    expect(publicId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(repository.updateMany).toHaveBeenCalledWith({
      where: { id: BigInt(2), public_id: null },
      data: { public_id: publicId },
    });
  });

  it('uses the UUID written by a concurrent request that won the race', async () => {
    const repository = createRepository();
    repository.updateMany.mockResolvedValue({ count: 0 });
    repository.findUnique.mockResolvedValue({ public_id: CONCURRENT_PUBLIC_ID });

    await expect(ensureUserPublicId(
      { id: BigInt(3), public_id: null },
      repository,
    )).resolves.toBe(CONCURRENT_PUBLIC_ID);
  });
});
