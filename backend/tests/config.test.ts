// Mocked so this test's outcome doesn't depend on whether the machine
// running it happens to have a real backend/.env file with JWT_SECRET set
// (the normal case for local dev) -- without this, the test would pass on
// CI/a fresh clone but silently fail on any machine with a working setup.
jest.mock('dotenv', () => ({ config: jest.fn() }));

describe('config', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.JWT_SECRET;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('throws on startup if JWT_SECRET is not set', () => {
    expect(() => require('../src/config')).toThrow(/JWT_SECRET/);
  });
});
