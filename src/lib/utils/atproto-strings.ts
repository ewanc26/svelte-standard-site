import type { AtIdentifierString, AtUriString, DidString } from '@atproto/lex';

const DID = /^did:[a-z]+:[A-Za-z0-9._:%-]+$/;
const HANDLE = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const AT_URI = /^at:\/\/[^\s/]+(\/[^\s/]+(\/[^\s/]+)?)?$/;

function check(value: string, pattern: RegExp, kind: string): string {
	if (!pattern.test(value)) throw new Error(`Invalid ${kind}: ${value}`);
	return value;
}

export function asDid(value: string): DidString {
	return check(value, DID, 'DID') as DidString;
}

export function asAtIdentifier(value: string): AtIdentifierString {
	return (value.startsWith('did:') ? asDid(value) : check(value, HANDLE, 'handle')) as AtIdentifierString;
}

export function asAtUri(value: string): AtUriString {
	return check(value, AT_URI, 'AT URI') as AtUriString;
}
