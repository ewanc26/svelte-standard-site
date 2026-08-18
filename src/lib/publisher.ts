import { Client } from '@atproto/lex';
import { PasswordSession } from '@bsky/sdk';
import { com } from '@bsky/sdk/lexicons';
import type { PublisherConfig, Document, Publication } from './schemas.js';
import { PublisherConfigSchema, COLLECTIONS } from './schemas.js';

async function resolveHandle(handle: string): Promise<string> {
	const res = await fetch(
		`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`
	);
	if (!res.ok) throw new Error(`Failed to resolve handle: ${handle}`);
	const data = (await res.json()) as { did: string };
	return data.did;
}

async function getPdsFromDid(did: string): Promise<string> {
	let didDoc: any;

	if (did.startsWith('did:plc:')) {
		const res = await fetch(`https://plc.directory/${did}`);
		if (!res.ok) throw new Error(`Failed to resolve DID: ${did}`);
		didDoc = await res.json();
	} else if (did.startsWith('did:web:')) {
		const domain = did.replace('did:web:', '');
		const res = await fetch(`https://${domain}/.well-known/did.json`);
		if (!res.ok) throw new Error(`Failed to resolve DID: ${did}`);
		didDoc = await res.json();
	} else {
		throw new Error(`Unsupported DID method: ${did}`);
	}

	const pdsService = didDoc.service?.find(
		(s: any) => s.type === 'AtprotoPersonalDataServer' || s.id === '#atproto_pds'
	);

	if (!pdsService?.serviceEndpoint) {
		throw new Error(`No PDS found in DID document for ${did}`);
	}

	return pdsService.serviceEndpoint;
}

const BASE32_SORTABLE = '234567abcdefghijklmnopqrstuvwxyz';

function generateTid(): string {
	const now = Date.now() * 1000;
	const clockId = Math.floor(Math.random() * 1024);

	const tid = ((BigInt(now) << 10n) | BigInt(clockId)) & 0x7fffffffffffffffn;

	let encoded = '';
	let remaining = tid;
	for (let i = 0; i < 13; i++) {
		const index = Number(remaining & 31n);
		encoded = BASE32_SORTABLE[index] + encoded;
		remaining = remaining >> 5n;
	}

	return encoded;
}

export interface PublishDocumentInput {
	site: string;
	title: string;
	publishedAt: string;
	path?: string;
	description?: string;
	updatedAt?: string;
	tags?: string[];
	textContent?: string;
	content?: unknown;
	bskyPostRef?: { uri: string; cid: string };
	coverImage?: {
		$type: 'blob';
		ref: { $link: string };
		mimeType: string;
		size: number;
	};
}

export interface PublishPublicationInput {
	name: string;
	url: string;
	description?: string;
	icon?: {
		$type: 'blob';
		ref: { $link: string };
		mimeType: string;
		size: number;
	};
	basicTheme?: {
		background: { r: number; g: number; b: number };
		foreground: { r: number; g: number; b: number };
		accent: { r: number; g: number; b: number };
		accentForeground: { r: number; g: number; b: number };
	};
	preferences?: {
		showInDiscover?: boolean;
	};
}

export interface PublishResult {
	uri: string;
	cid: string;
}

export class StandardSitePublisher {
	private client: Client | null = null;
	private session: unknown | null = null;
	private config: PublisherConfig;
	private did: string | null = null;
	private pdsUrl: string | null = null;

	constructor(config: Partial<PublisherConfig>) {
		this.config = PublisherConfigSchema.parse(config);
	}

	async login(): Promise<void> {
		let did = this.config.identifier;
		if (!did.startsWith('did:')) {
			did = await resolveHandle(this.config.identifier);
		}
		this.did = did;

		if (this.config.service) {
			this.pdsUrl = this.config.service;
		} else {
			this.pdsUrl = await getPdsFromDid(did);
		}

		this.session = await PasswordSession.login({
			service: this.pdsUrl,
			identifier: this.config.identifier,
			password: this.config.password
		});
		this.client = new Client(this.session);
	}

	getDid(): string {
		if (!this.did) {
			throw new Error('Not logged in. Call login() first.');
		}
		return this.did;
	}

	getPdsUrl(): string {
		if (!this.pdsUrl) {
			throw new Error('Not logged in. Call login() first.');
		}
		return this.pdsUrl;
	}

	private getClient(): Client {
		if (!this.client) {
			throw new Error('Not logged in. Call login() first.');
		}
		return this.client;
	}

	async publishDocument(input: PublishDocumentInput): Promise<PublishResult> {
		const did = this.getDid();
		const client = this.getClient();

		const record: Document = {
			$type: 'site.standard.document',
			site: input.site,
			title: input.title,
			publishedAt: input.publishedAt,
			path: input.path,
			description: input.description,
			updatedAt: input.updatedAt,
			tags: input.tags,
			textContent: input.textContent,
			content: input.content,
			bskyPostRef: input.bskyPostRef,
			coverImage: input.coverImage
		};

		const cleanRecord = Object.fromEntries(
			Object.entries(record).filter(([_, v]) => v !== undefined)
		) as Document;

		const rkey = generateTid();

		const response = await client.call(com.atproto.repo.createRecord, {
			repo: did,
			collection: COLLECTIONS.DOCUMENT,
			rkey,
			record: cleanRecord
		});

		return {
			uri: response.uri,
			cid: response.cid
		};
	}

	async updateDocument(rkey: string, input: PublishDocumentInput): Promise<PublishResult> {
		const did = this.getDid();
		const client = this.getClient();

		const record: Document = {
			$type: 'site.standard.document',
			site: input.site,
			title: input.title,
			publishedAt: input.publishedAt,
			path: input.path,
			description: input.description,
			updatedAt: input.updatedAt ?? new Date().toISOString(),
			tags: input.tags,
			textContent: input.textContent,
			content: input.content,
			bskyPostRef: input.bskyPostRef,
			coverImage: input.coverImage
		};

		const cleanRecord = Object.fromEntries(
			Object.entries(record).filter(([_, v]) => v !== undefined)
		) as Document;

		const response = await client.call(com.atproto.repo.putRecord, {
			repo: did,
			collection: COLLECTIONS.DOCUMENT,
			rkey,
			record: cleanRecord
		});

		return {
			uri: response.uri,
			cid: response.cid
		};
	}

	async deleteDocument(rkey: string): Promise<void> {
		const did = this.getDid();
		const client = this.getClient();

		await client.call(com.atproto.repo.deleteRecord, {
			repo: did,
			collection: COLLECTIONS.DOCUMENT,
			rkey
		});
	}

	async publishPublication(input: PublishPublicationInput): Promise<PublishResult> {
		const did = this.getDid();
		const client = this.getClient();

		const record: Publication = {
			$type: 'site.standard.publication',
			name: input.name,
			url: input.url,
			description: input.description,
			icon: input.icon,
			basicTheme: input.basicTheme,
			preferences: input.preferences
		};

		const cleanRecord = Object.fromEntries(
			Object.entries(record).filter(([_, v]) => v !== undefined)
		) as Publication;

		const rkey = generateTid();

		const response = await client.call(com.atproto.repo.createRecord, {
			repo: did,
			collection: COLLECTIONS.PUBLICATION,
			rkey,
			record: cleanRecord
		});

		return {
			uri: response.uri,
			cid: response.cid
		};
	}

	async updatePublication(rkey: string, input: PublishPublicationInput): Promise<PublishResult> {
		const did = this.getDid();
		const client = this.getClient();

		const record: Publication = {
			$type: 'site.standard.publication',
			name: input.name,
			url: input.url,
			description: input.description,
			icon: input.icon,
			basicTheme: input.basicTheme,
			preferences: input.preferences
		};

		const cleanRecord = Object.fromEntries(
			Object.entries(record).filter(([_, v]) => v !== undefined)
		) as Publication;

		const response = await client.call(com.atproto.repo.putRecord, {
			repo: did,
			collection: COLLECTIONS.PUBLICATION,
			rkey,
			record: cleanRecord
		});

		return {
			uri: response.uri,
			cid: response.cid
		};
	}

	async deletePublication(rkey: string): Promise<void> {
		const did = this.getDid();
		const client = this.getClient();

		await client.call(com.atproto.repo.deleteRecord, {
			repo: did,
			collection: COLLECTIONS.PUBLICATION,
			rkey
		});
	}

	async listDocuments(
		limit = 100
	): Promise<Array<{ uri: string; cid: string; value: Document }>> {
		const did = this.getDid();
		const client = this.getClient();

		const response = await client.call(com.atproto.repo.listRecords, {
			repo: did,
			collection: COLLECTIONS.DOCUMENT,
			limit
		});

		return response.records.map((r) => ({
			uri: r.uri,
			cid: r.cid,
			value: r.value as Document
		}));
	}

	async listPublications(
		limit = 100
	): Promise<Array<{ uri: string; cid: string; value: Publication }>> {
		const did = this.getDid();
		const client = this.getClient();

		const response = await client.call(com.atproto.repo.listRecords, {
			repo: did,
			collection: COLLECTIONS.PUBLICATION,
			limit
		});

		return response.records.map((r) => ({
			uri: r.uri,
			cid: r.cid,
			value: r.value as Publication
		}));
	}

	getAtpAgent(): Client {
		return this.getClient();
	}
}

export type { PublisherConfig };
