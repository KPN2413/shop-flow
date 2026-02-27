// Re-export from the canonical auth context
// This ensures all components (both admin/ and public/) use the same auth state
export { useAuth } from '../lib/auth-context'
