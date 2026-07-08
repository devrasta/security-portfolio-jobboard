import { ExecutionContext } from '@nestjs/common';
import { ThrottlerOptions } from '@nestjs/throttler';
import { MailThrottlerGuard } from './mail-throttler.guard';

const mockHandleRequest = jest.fn().mockResolvedValue(true);

jest.mock('@nestjs/throttler', () => ({
  ThrottlerGuard: class ThrottlerGuard {
    handleRequest(...args: any[]) {
      return mockHandleRequest(...args);
    }
  },
  ThrottlerOptions: {},
}));

const createMockContext = (
  body: Record<string, any>,
  ip = '127.0.0.1',
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ body, ip }),
    }),
  }) as ExecutionContext;

describe('MailThrottlerGuard', () => {
  let guard: MailThrottlerGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new MailThrottlerGuard({} as any, {} as any, {} as any);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('getTracker', () => {
    it('should combine ip and email as tracker key', async () => {
      const req = { ip: '127.0.0.1', body: { email: 'user@test.com' } };
      await expect((guard as any).getTracker(req)).resolves.toBe(
        '127.0.0.1-user@test.com',
      );
    });

    it('should use empty string as email suffix when email is missing from body', async () => {
      const req = { ip: '10.0.0.1', body: {} };
      await expect((guard as any).getTracker(req)).resolves.toBe('10.0.0.1-');
    });

    it('should use empty string as email suffix when body is undefined', async () => {
      const req = { ip: '10.0.0.1' };
      await expect((guard as any).getTracker(req)).resolves.toBe('10.0.0.1-');
    });
  });

  describe('getLimit', () => {
    describe('loginByEmail throttler', () => {
      const throttler = { name: 'loginByEmail' } as ThrottlerOptions;

      it('should use email as generateKey tracker when email is present', async () => {
        const context = createMockContext({ email: 'user@test.com' });

        await guard.getLimit(context, 5, 60, throttler);

        const callArgs = mockHandleRequest.mock.calls[0][0];
        expect(callArgs.generateKey()).toBe('user@test.com');
        expect(callArgs.limit).toBe(5);
        expect(callArgs.ttl).toBe(60);
      });

      it('should fall back to ip as generateKey tracker when email is absent', async () => {
        const context = createMockContext({}, '192.168.0.1');

        await guard.getLimit(context, 5, 60, throttler);

        const callArgs = mockHandleRequest.mock.calls[0][0];
        expect(callArgs.generateKey()).toBe('192.168.0.1');
      });

      it('should call super.handleRequest with spread request + limit + ttl + generateKey', async () => {
        const context = createMockContext({ email: 'a@b.com' });

        await guard.getLimit(context, 3, 120, throttler);

        expect(mockHandleRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            body: { email: 'a@b.com' },
            ip: '127.0.0.1',
            limit: 3,
            ttl: 120,
            generateKey: expect.any(Function),
          }),
        );
      });

      it('should return the result from super.handleRequest', async () => {
        mockHandleRequest.mockResolvedValueOnce(false);
        const context = createMockContext({ email: 'a@b.com' });

        const result = await guard.getLimit(context, 5, 60, throttler);

        expect(result).toBe(false);
      });
    });

    describe('other throttlers', () => {
      it('should forward limit, ttl and throttler to super.handleRequest', async () => {
        const throttler = { name: 'global' } as ThrottlerOptions;
        const context = createMockContext({ email: 'user@test.com' });

        await guard.getLimit(context, 10, 30, throttler);

        expect(mockHandleRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            limit: 10,
            ttl: 30,
            throttler,
          }),
        );
      });

      it('should not include generateKey for non-loginByEmail throttlers', async () => {
        const throttler = { name: 'api' } as ThrottlerOptions;
        const context = createMockContext({});

        await guard.getLimit(context, 10, 30, throttler);

        const callArgs = mockHandleRequest.mock.calls[0][0];
        expect(callArgs.generateKey).toBeUndefined();
      });
    });
  });
});
