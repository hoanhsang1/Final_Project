import { describe, expect, it } from 'vitest';
import { ApiError, getApiCode, type ApiEnvelope } from './errorCodes';

describe('ApiEnvelope', () => {
  it('giữ code dạng chuỗi trong envelope lỗi', () => {
    const envelope: ApiEnvelope<null> = {
      success: false,
      code: 'LOGIN_RATE_LIMITED',
      message: 'Too many login attempts',
      data: null,
    };

    expect(typeof envelope.code).toBe('string');
    expect(getApiCode({ response: { data: envelope } })).toBe('LOGIN_RATE_LIMITED');
  });

  it('envelope thành công có code: null → getApiCode trả undefined', () => {
    const envelope: ApiEnvelope<{ ok: true }> = {
      success: true,
      code: null,
      message: 'OK',
      data: { ok: true },
    };

    expect(envelope.code).toBeNull();
    expect(getApiCode({ response: { data: envelope } })).toBeUndefined();
  });

  it('lỗi không có response → undefined', () => {
    expect(getApiCode({ request: {} })).toBeUndefined();
    expect(getApiCode(undefined)).toBeUndefined();
  });

  it('KHÔNG nhận diện code số 1133 (chỉ nhận chuỗi)', () => {
    expect(getApiCode({ response: { data: { code: 1133 } } })).toBeUndefined();
  });
});

describe('ApiError', () => {
  it('giữ code và status để luồng đăng nhập xử lý tiếp', () => {
    const error = new ApiError('Bạn đã đăng nhập quá nhiều lần.', {
      code: 'LOGIN_RATE_LIMITED',
      status: 429,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Bạn đã đăng nhập quá nhiều lần.');
    expect(error.code).toBe('LOGIN_RATE_LIMITED');
    expect(error.status).toBe(429);
  });
});
