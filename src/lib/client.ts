import type {
	SiteStandardConfig,
	Publication,
	Document,
	AtProtoRecord,
	ResolvedIdentity
} from './types.js';
import { cache } from './utils/cache.js';
import { resolveIdentity, withFallback, buildPdsBlobUrl } from './utils/agents.js';
import { parseAtUri, atUriToHttps } from './utils/at-uri.js';
import { com } from '@bsky/sdk/lexicons';

export class SiteStandardClient {
	private config: Required<SiteStandardConfig>;
	private pdsEndpoint: string | null = null;

	constructor(config: SiteStandardConfig) {
		this.config = {
			did: config.did,
			pds: config.pds ?? '',
			cacheTTL: config.cacheTTL ?? 5 * 60 * 1000
		};

		cache.setDefaultTTL(this.config.cacheTTL);
	}

	private async resolvePDS(fetchFn?: typeof fetch): Promise<string> {
		if (this.pdsEndpoint) return this.pdsEndpoint;

		if (this.config.pds) {
			this.pdsEndpoint = this.config.pds;
			return this.pdsEndpoint;
		}

		const identity = await resolveIdentity(this.config.did, fetchFn);
		this.pdsEndpoint = identity.pds;
		return this.pdsEndpoint;
	}

	private async getBlobUrl(blob: any, fetchFn?: typeof fetch): Promise<string | undefined> {
		try {
			const cid = blob?.ref?.$link || blob?.cid;
			if (!cid) return undefined;

			const pds = await this.resolvePDS(fetchFn);
			return buildPdsBlobUrl(pds, this.config.did, cid);
		} catch (error) {
			console.warn('Failed to resolve blob URL:', error);
			return undefined;
		}
	}

	async fetchPublication(
		rkey: string,
		fetchFn?: typeof fetch
	): Promise<AtProtoRecord<Publication> | null> {
		const cacheKey = `publication:${this.config.did}:${rkey}`;
		const cached = cache.get<AtProtoRecord<Publication>>(cacheKey);
		if (cached) return cached;

		try {
			const result = await withFallback(
				this.config.did,
				async (client) => {
					const response = await client.call(com.atproto.repo.getRecord, {
						repo: this.config.did,
						collection: 'site.standard.publication',
						rkey
					});
					return response;
				},
				fetchFn
			);

			if (!result || !result.value) return null;

			const pubValue = result.value as any;

			const record: AtProtoRecord<Publication> = {
				uri: result.uri,
				cid: result.cid || '',
				value: {
					$type: 'site.standard.publication',
					url: pubValue.url,
					name: pubValue.name,
					icon: pubValue.icon ? await this.getBlobUrl(pubValue.icon, fetchFn) : undefined,
					description: pubValue.description,
					basicTheme: pubValue.basicTheme,
					preferences: pubValue.preferences
				}
			};

			cache.set(cacheKey, record);
			return record;
		} catch (error) {
			console.error(`Failed to fetch publication ${rkey}:`, error);
			return null;
		}
	}

	async fetchAllPublications(fetchFn?: typeof fetch): Promise<AtProtoRecord<Publication>[]> {
		const cacheKey = `publications:${this.config.did}:all`;
		const cached = cache.get<AtProtoRecord<Publication>[]>(cacheKey);
		if (cached) return cached;

		try {
			const allRecords: AtProtoRecord<Publication>[] = [];
			let cursor: string | undefined;

			do {
				const records = await withFallback(
					this.config.did,
					async (client) => {
						const response = await client.call(com.atproto.repo.listRecords, {
							repo: this.config.did,
							collection: 'site.standard.publication',
							limit: 100,
							cursor
						});
						cursor = response.cursor;
						return response.records;
					},
					fetchFn
				);

				for (const record of records) {
					const pubValue = record.value as any;
					const pub: AtProtoRecord<Publication> = {
						uri: record.uri,
						cid: record.cid || '',
						value: {
							$type: 'site.standard.publication',
							url: pubValue.url,
							name: pubValue.name,
							icon: pubValue.icon ? await this.getBlobUrl(pubValue.icon, fetchFn) : undefined,
							description: pubValue.description,
							basicTheme: pubValue.basicTheme,
							preferences: pubValue.preferences
						}
					};
					allRecords.push(pub);
				}
			} while (cursor);

			cache.set(cacheKey, allRecords);
			return allRecords;
		} catch (error) {
			console.error('Failed to fetch publications:', error);
			return [];
		}
	}

	async fetchDocument(
		rkey: string,
		fetchFn?: typeof fetch
	): Promise<AtProtoRecord<Document> | null> {
		const cacheKey = `document:${this.config.did}:${rkey}`;
		const cached = cache.get<AtProtoRecord<Document>>(cacheKey);
		if (cached) return cached;

		try {
			const result = await withFallback(
				this.config.did,
				async (client) => {
					const response = await client.call(com.atproto.repo.getRecord, {
						repo: this.config.did,
						collection: 'site.standard.document',
						rkey
					});
					return response;
				},
				fetchFn
			);

			if (!result || !result.value) return null;

			const docValue = result.value as any;

			const record: AtProtoRecord<Document> = {
				uri: result.uri,
				cid: result.cid || '',
				value: {
					$type: 'site.standard.document',
					site: docValue.site,
					title: docValue.title,
					path: docValue.path,
					description: docValue.description,
					coverImage: docValue.coverImage
						? await this.getBlobUrl(docValue.coverImage, fetchFn)
						: undefined,
					content: docValue.content,
					textContent: docValue.textContent,
					bskyPostRef: docValue.bskyPostRef,
					tags: docValue.tags,
					publishedAt: docValue.publishedAt,
					updatedAt: docValue.updatedAt
				}
			};

			cache.set(cacheKey, record);
			return record;
		} catch (error) {
			console.error(`Failed to fetch document ${rkey}:`, error);
			return null;
		}
	}

	async fetchAllDocuments(fetchFn?: typeof fetch): Promise<AtProtoRecord<Document>[]> {
		const cacheKey = `documents:${this.config.did}:all`;
		const cached = cache.get<AtProtoRecord<Document>[]>(cacheKey);
		if (cached) return cached;

		try {
			const allRecords: AtProtoRecord<Document>[] = [];
			let cursor: string | undefined;

			do {
				const records = await withFallback(
					this.config.did,
					async (client) => {
						const response = await client.call(com.atproto.repo.listRecords, {
							repo: this.config.did,
							collection: 'site.standard.document',
							limit: 100,
							cursor
						});
						cursor = response.cursor;
						return response.records;
					},
					fetchFn
				);

				for (const record of records) {
					const docValue = record.value as any;
					const doc: AtProtoRecord<Document> = {
						uri: record.uri,
						cid: record.cid || '',
						value: {
							$type: 'site.standard.document',
							site: docValue.site,
							title: docValue.title,
							path: docValue.path,
							description: docValue.description,
							coverImage: docValue.coverImage
								? await this.getBlobUrl(docValue.coverImage, fetchFn)
								: undefined,
							content: docValue.content,
							textContent: docValue.textContent,
							bskyPostRef: docValue.bskyPostRef,
							tags: docValue.tags,
							publishedAt: docValue.publishedAt,
							updatedAt: docValue.updatedAt
						}
					};
					allRecords.push(doc);
				}
			} while (cursor);

			allRecords.sort(
				(a, b) => new Date(b.value.publishedAt).getTime() - new Date(a.value.publishedAt).getTime()
			);

			cache.set(cacheKey, allRecords);
			return allRecords;
		} catch (error) {
			console.error('Failed to fetch documents:', error);
			return [];
		}
	}

	async fetchDocumentsByPublication(
		publicationUri: string,
		fetchFn?: typeof fetch
	): Promise<AtProtoRecord<Document>[]> {
		const allDocs = await this.fetchAllDocuments(fetchFn);
		return allDocs.filter((doc) => doc.value.site === publicationUri);
	}

	async fetchByAtUri<T = Publication | Document>(
		atUri: string,
		fetchFn?: typeof fetch
	): Promise<AtProtoRecord<T> | null> {
		const parsed = parseAtUri(atUri);
		if (!parsed) {
			console.error('Invalid AT URI:', atUri);
			return null;
		}

		if (parsed.collection === 'site.standard.publication') {
			return this.fetchPublication(parsed.rkey, fetchFn) as Promise<AtProtoRecord<T> | null>;
		} else if (parsed.collection === 'site.standard.document') {
			return this.fetchDocument(parsed.rkey, fetchFn) as Promise<AtProtoRecord<T> | null>;
		}

		return null;
	}

	clearCache(): void {
		cache.clear();
	}

	async getPDS(fetchFn?: typeof fetch): Promise<string> {
		return this.resolvePDS(fetchFn);
	}
}

export function createClient(config: SiteStandardConfig): SiteStandardClient {
	return new SiteStandardClient(config);
}
