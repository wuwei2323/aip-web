import { describe, expect, it, vi } from 'vitest';
import type { SsoExchangeParams } from '../../api/types';
import { consumeSsoCallbackTransaction } from '../ssoTransaction';

type CallbackQuery = Parameters<typeof consumeSsoCallbackTransaction>[0];
type TransactionStorage = Parameters<typeof consumeSsoCallbackTransaction>[1];

const STATE = 'state-value';
const CALLBACK_URL = 'https://portal.example.test/app/sso/callback?flow=original%2Fpath';
const TARGET_PATH = '/system/user?tab=roles';
const QUERY = { code: 'authorization-code', state: STATE };
const TRANSACTION_KEYS = ['sso_state', 'sso_nonce', 'sso_code_verifier', 'sso_callback_url'];

function createStorage(overrides: Record<string, unknown> = {}) {
  const values = new Map<string, unknown>(
    Object.entries({
      sso_state: STATE,
      sso_nonce: 'nonce-value',
      sso_code_verifier: 'verifier-value',
      sso_callback_url: CALLBACK_URL,
      sso_target_path: TARGET_PATH,
      ...overrides
    })
  );
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: vi.fn((key: string) => {
      values.delete(key);
    })
  };
  return { values, storage };
}

function expectConsumed(fixture: ReturnType<typeof createStorage>) {
  for (const key of TRANSACTION_KEYS) {
    expect(fixture.values.has(key)).toBe(false);
    expect(fixture.storage.removeItem).toHaveBeenCalledWith(key);
  }
  expect(fixture.values.get('sso_target_path')).toBe(TARGET_PATH);
  expect(fixture.storage.removeItem).not.toHaveBeenCalledWith('sso_target_path');
}

// 与回调页面保持相同的换票边界：只有就绪事务才允许调用换票函数。
function consumeAndExchange(query: CallbackQuery, storage: TransactionStorage, exchange: (params: SsoExchangeParams) => unknown) {
  const transaction = consumeSsoCallbackTransaction(query, storage);
  if (transaction.status === 'ready') {
    exchange(transaction.params);
  }
  return transaction;
}

const invalidStrings = [
  { label: '缺失', value: undefined },
  { label: '为 null', value: null },
  { label: '为空字符串', value: '' },
  { label: '仅含空白', value: '   ' },
  { label: '为数字', value: 42 },
  { label: '为布尔值', value: false },
  { label: '为对象', value: {} },
  { label: '为单元素数组', value: [STATE] },
  { label: '为重复参数数组', value: [STATE, STATE] }
];

describe('SSO 回调事务', () => {
  it('正常事务在换票前清理敏感参数，原样使用发起时的回调 URL，并保留成功及改密目标', () => {
    const fixture = createStorage();
    const exchange = vi.fn(() => expectConsumed(fixture));

    const transaction = consumeAndExchange(QUERY, fixture.storage, exchange);

    expect(transaction).toEqual({
      status: 'ready',
      params: {
        code: QUERY.code,
        codeVerifier: 'verifier-value',
        redirectUri: CALLBACK_URL,
        nonce: 'nonce-value'
      }
    });
    expect(exchange).toHaveBeenCalledExactlyOnceWith({
      code: QUERY.code,
      codeVerifier: 'verifier-value',
      redirectUri: CALLBACK_URL,
      nonce: 'nonce-value'
    });
    expect(fixture.storage.removeItem).toHaveBeenCalledTimes(4);
  });

  it.each(invalidStrings)('回调 state $label 时清理且不换票', ({ value }) => {
    const fixture = createStorage();
    const exchange = vi.fn();

    expect(consumeAndExchange({ ...QUERY, state: value }, fixture.storage, exchange)).toEqual({ status: 'invalid-transaction' });

    expectConsumed(fixture);
    expect(exchange).not.toHaveBeenCalled();
  });

  it.each(invalidStrings)('保存的 state $label 时清理且不换票', ({ value }) => {
    const fixture = createStorage({ sso_state: value });
    const exchange = vi.fn();

    expect(consumeAndExchange(QUERY, fixture.storage, exchange)).toEqual({ status: 'invalid-transaction' });

    expectConsumed(fixture);
    expect(exchange).not.toHaveBeenCalled();
  });

  it.each(['different-state', ` ${STATE} `, STATE.toUpperCase()])('state 不严格匹配（%s）时清理且不换票', (state) => {
    const fixture = createStorage();
    const exchange = vi.fn();

    expect(consumeAndExchange({ ...QUERY, state }, fixture.storage, exchange)).toEqual({ status: 'invalid-transaction' });

    expectConsumed(fixture);
    expect(exchange).not.toHaveBeenCalled();
  });

  it.each(['sso_nonce', 'sso_code_verifier', 'sso_callback_url'].flatMap((key) => invalidStrings.map(({ label, value }) => ({ key, label, value }))))(
    '$key $label 时拒绝，不重构回调 URL，也不换票',
    ({ key, value }) => {
      const fixture = createStorage({ [key]: value });
      const exchange = vi.fn();

      expect(consumeAndExchange(QUERY, fixture.storage, exchange)).toEqual({ status: 'invalid-transaction' });

      expectConsumed(fixture);
      expect(exchange).not.toHaveBeenCalled();
    }
  );

  it.each(invalidStrings)('code $label 时清理且不换票', ({ value }) => {
    const fixture = createStorage();
    const exchange = vi.fn();

    expect(consumeAndExchange({ ...QUERY, code: value }, fixture.storage, exchange)).toEqual({ status: 'missing-code' });

    expectConsumed(fixture);
    expect(exchange).not.toHaveBeenCalled();
  });

  it.each([
    { label: '标准 OAuth 错误', error: 'access_denied' },
    { label: '空错误字符串', error: '' },
    { label: '无错误值', error: null },
    { label: '重复错误参数数组', error: ['access_denied', 'login_required'] }
  ])('$label 回调即使有有效 code/state 也清理敏感事务且不换票', ({ error }) => {
    const fixture = createStorage();
    const exchange = vi.fn();

    expect(consumeAndExchange({ ...QUERY, error }, fixture.storage, exchange)).toEqual({ status: 'oauth-error' });
    expect(consumeAndExchange(QUERY, fixture.storage, exchange)).toEqual({ status: 'invalid-transaction' });

    expectConsumed(fixture);
    expect(exchange).not.toHaveBeenCalled();
  });

  it('事务一次性消费，重复回调不再次换票', () => {
    const fixture = createStorage();
    const exchange = vi.fn(() => expectConsumed(fixture));

    expect(consumeAndExchange(QUERY, fixture.storage, exchange).status).toBe('ready');
    expect(consumeAndExchange(QUERY, fixture.storage, exchange)).toEqual({ status: 'invalid-transaction' });

    expectConsumed(fixture);
    expect(exchange).toHaveBeenCalledTimes(1);
    expect(fixture.storage.removeItem).toHaveBeenCalledTimes(8);
  });
});
