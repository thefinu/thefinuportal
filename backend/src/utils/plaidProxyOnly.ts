/**
 * Feature flag: when PLAID_PROXY_ONLY is set, the server makes all Plaid API
 * calls on behalf of the add-on and access tokens are never sent to the client.
 */

/** True when the server should proxy all Plaid calls (tokens stay server-side). */
export function plaidProxyOnly(): boolean {
    return process.env.PLAID_PROXY_ONLY === '1' || process.env.PLAID_PROXY_ONLY === 'true';
}

/** Strip the access_token from a single account object before sending to the client. */
export function withoutAccessToken(account: any): any {
    if (!account) return account;
    const plain = typeof account.toObject === 'function' ? account.toObject() : { ...account };
    delete plain.access_token;
    return plain;
}

/** Strip access_token from an array of account objects. */
export function withoutAccessTokens(accounts: any[]): any[] {
    return accounts.map(withoutAccessToken);
}
