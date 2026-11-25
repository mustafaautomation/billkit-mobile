import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEMO_AS_OF } from '../domain/types';
import { createMockRepository } from './mockRepository';
import type { BillkitRepository } from './repository';
import { createSupabaseClient, readSupabaseConfig } from './supabaseClient';
import { createSupabaseRepository } from './supabaseRepository';

export function createRepository(): BillkitRepository {
  const config = readSupabaseConfig();
  if (config) return createSupabaseRepository(createSupabaseClient(config.url, config.anonKey));
  return createMockRepository({ storage: AsyncStorage, asOf: DEMO_AS_OF });
}

let singleton: BillkitRepository | null = null;

export function getRepository(): BillkitRepository {
  if (!singleton) singleton = createRepository();
  return singleton;
}
