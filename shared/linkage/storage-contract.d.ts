import type { PersonalArtifact } from './platform-client.d.ts';
declare const contract: {
  validRecordKey(value: unknown): value is string;
  validArtifact(value: unknown): value is PersonalArtifact;
  randomUUID(provider?: Pick<Crypto, 'getRandomValues'>): string;
  creatorDatabase: 'nova-creator-v1';
};
export default contract;
