import type { SsoExchangeParams } from '@/api/types';

type SsoCallbackQuery = {
  code?: unknown;
  state?: unknown;
  error?: unknown;
};

type SsoTransactionStorage = {
  getItem(key: string): unknown;
  removeItem(key: string): void;
};

type SsoCallbackTransaction = { status: 'ready'; params: SsoExchangeParams } | { status: 'oauth-error' | 'missing-code' | 'invalid-transaction' };

const TRANSACTION_KEYS = ['sso_state', 'sso_nonce', 'sso_code_verifier', 'sso_callback_url'] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 同步读取并一次性消费 SSO 事务；任何回调（包括 OAuth 错误）都清理敏感参数。
 * 仅完整且 state 严格匹配的事务可换票，不消费成功或强制改密时使用的目标路径。
 */
export function consumeSsoCallbackTransaction(query: SsoCallbackQuery, storage: SsoTransactionStorage): SsoCallbackTransaction {
  const [savedState, nonce, codeVerifier, savedCallbackUrl] = TRANSACTION_KEYS.map((key) => storage.getItem(key));
  TRANSACTION_KEYS.forEach((key) => storage.removeItem(key));

  if (query.error !== undefined) {
    return { status: 'oauth-error' };
  }
  if (!isNonEmptyString(query.code)) {
    return { status: 'missing-code' };
  }
  if (
    !isNonEmptyString(query.state) ||
    !isNonEmptyString(savedState) ||
    query.state !== savedState ||
    !isNonEmptyString(nonce) ||
    !isNonEmptyString(codeVerifier) ||
    !isNonEmptyString(savedCallbackUrl)
  ) {
    return { status: 'invalid-transaction' };
  }

  return {
    status: 'ready',
    params: {
      code: query.code,
      codeVerifier,
      // 使用登录发起时记录的准确回调地址，确保与 Keycloak 发起时 100% 一致（适配子路径部署），禁止缺失时重构。
      redirectUri: savedCallbackUrl,
      nonce
    }
  };
}
