import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

// Um único cliente Supabase compartilhado por toda a aplicação.
// Antes, AuthService e ParkingService criavam cada um o seu próprio cliente,
// duplicando conexões e o processamento de autenticação.
export const supabase: SupabaseClient | null =
  environment.supabaseUrl && environment.supabaseKey
    ? createClient(environment.supabaseUrl, environment.supabaseKey)
    : null;
