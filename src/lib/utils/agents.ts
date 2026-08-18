import { Client } from '@atproto/lex';
import type { ResolvedIdentity } from '../types.js';
import { cache } from './cache.js';

export function createAgent(service: string, fetchFn?: typeof fetch): Client {
	const wrappedFetch = fetchFn
		? async (url: URL | RequestInfo, init?: RequestInit) => {
				const urlStr = url instanceof URL ? url.toString() : url;
				const response = await fetchFn(urlStr, init);

				const headers = new Headers(response.headers);
				if (!headers.has('content-type')) {
					headers.set('content-type', 'application/json');
				}

				return new Response(response.body, {
					status: response.status,
					statusText: response.statusText,
					headers
				});
			}
		: undefined;

	return new Client(service, { fetch: wrappedFetch });
}

export async function resolveIdentity(
	did: string,
	fetchFn?: typeof fetch
): Promise<ResolvedIdentity> {
	const cacheKey = `identity:${did}`;
	const cached = cache.get<ResolvedIdentity>(cacheKey);
	if (cached) return cached;

	const _fetch = fetchFn ?? globalThis.fetch;

	const response = await _fetch(
		`https://slingshot.microcosm.blue/xrpc/com.bad-example.identity.resolveMiniDoc?identifier=${encodeURIComponent(did)}`
	);

	if (!response.ok) {
		throw new Error(`Failed to resolve DID: ${response.status} ${response.statusText}`);
	}

	const rawText = await response.text();
	const data = JSON.parse(rawText);

	if (!data.did || !data.pds) {
		throw new Error('Invalid response from identity resolver');
	}

	cache.set(cacheKey, data);
	return data;
}

export async function getPDSAgent(did: string, fetchFn?: typeof fetch): Promise<Client> {
	const resolved = await resolveIdentity(did, fetchFn);
	return createAgent(resolved.pds, fetchFn);
}

export async function withFallback<T>(
	did: string,
	operation: (client: Client) => Promise<T>,
	fetchFn?: typeof fetch
): Promise<T> {
	const agents = [
		() => getPDSAgent(did, fetchFn),
		() =>
			Promise.resolve(
				fetchFn
					? createAgent('https://public.api.bsky.app', fetchFn)
					: createAgent('https://public.api.bsky.app')
			)
	];

	let lastError: any;

	for (const getAgent of agents) {
		try {
			const client = await getAgent();
			return await operation(client);
		} catch (error) {
			lastError = error;
		}
	}

	throw lastError;
}

export function buildPdsBlobUrl(pds: string, did: string, cid: string): string {
	const pdsBase = pds.replace(/\/$/, '');
	return `${pdsBase}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}
