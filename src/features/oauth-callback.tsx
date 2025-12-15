import { useEffect, useState } from "react";
import { useIonRouter } from "@ionic/react";
import { useAuth } from "@/src/stores/auth";
import { Spinner } from "@/src/components/icons";

/**
 * OAuth Callback Handler
 * 
 * Handles the OAuth authorization code callback:
 * 1. Extract code and state from URL
 * 2. Verify state matches stored value (CSRF protection)
 * 3. Exchange code for JWT via Lemmy API
 * 4. Store JWT in auth store
 * 5. Redirect to home page
 */
export function OAuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  
  const updateSelectedAccount = useAuth((s: any) => s.updateSelectedAccount);
  const addAccount = useAuth((s: any) => s.addAccount);
  const router = useIonRouter();

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleCallback = async () => {
      try {
        // Extract code and state from URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const stateParam = params.get('state');

        console.log('🔍 [OAuth Callback] Code:', code ? 'present' : 'missing');
        console.log('🔍 [OAuth Callback] State:', stateParam ? 'present' : 'missing');

        if (!code || !stateParam) {
          throw new Error('Authorization denied or no code received');
        }

        // Get state from local storage (if available from desktop flow)
        let storedState: any = {};
        try {
          const storedStateStr = localStorage.getItem('oauth_state');
          console.log('🔍 [OAuth Callback] localStorage oauth_state:', storedStateStr ? 'found' : 'not found');
          storedState = JSON.parse(storedStateStr || '{}');
        } catch (e) {
          console.log('🔍 [OAuth Callback] Error reading localStorage:', e);
        }

        // Check if this is a mobile app flow or direct OAuth flow
        // Mobile/direct flow: localStorage state doesn't match URL state
        // Desktop flow: localStorage state matches URL state
        const isMobileOrDirectFlow = !storedState?.state || storedState.state !== stateParam;
        console.log('🔍 [OAuth Callback] localStorage state:', storedState?.state?.substring(0, 10) + '...' || 'none');
        console.log('🔍 [OAuth Callback] URL state:', stateParam?.substring(0, 10) + '...');
        console.log('🔍 [OAuth Callback] States match:', storedState?.state === stateParam);
        console.log('🔍 [OAuth Callback] Is mobile/direct flow:', isMobileOrDirectFlow);

        // Validate state for desktop flow only
        if (!isMobileOrDirectFlow) {
          if (!storedState?.expires_at || Date.now() > storedState.expires_at) {
            throw new Error('OAuth state expired - please try again');
          }
        }

        console.log('✅ [OAuth Callback] State verified, exchanging code for JWT...');

        // Determine instance URL and provider ID
        const instanceUrl = isMobileOrDirectFlow 
          ? window.location.origin  // Use current origin for mobile/direct flow
          : storedState.instance;
        
        const providerId = isMobileOrDirectFlow 
          ? 1  // Default to provider ID 1 (Iran Nation OAuth)
          : storedState.provider_id;

        const redirectUri = `${instanceUrl}/oauth/callback`;

        console.log('🔍 [OAuth Callback] Instance:', instanceUrl);
        console.log('🔍 [OAuth Callback] Provider ID:', providerId);
        console.log('🔍 [OAuth Callback] Redirect URI:', redirectUri);

        // Exchange authorization code for JWT via Lemmy's OAuth authenticate endpoint
        const tokenResponse = await fetch(`${instanceUrl}/api/v4/oauth/authenticate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code: code,
            oauth_provider_id: providerId,
            redirect_uri: redirectUri,
            show_nsfw: storedState.show_nsfw || false,
          }),
        });

        console.log('🔍 [OAuth Callback] Response status:', tokenResponse.status);
        console.log('🔍 [OAuth Callback] Response ok:', tokenResponse.ok);

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('❌ [OAuth Callback] Error response:', errorText);
          throw new Error(`HTTP ${tokenResponse.status}: ${tokenResponse.statusText}`);
        }

        const data = await tokenResponse.json();
        console.log('✅ [OAuth Callback] Response data:', data);
        console.log('✅ [OAuth Callback] JWT present:', !!data.jwt);
        console.log('✅ [OAuth Callback] verify_email_sent:', data.verify_email_sent);
        console.log('✅ [OAuth Callback] registration_created:', data.registration_created);

        if (!data.jwt) {
          if (data.verify_email_sent) {
            throw new Error('Please verify your email address');
          }
          if (data.registration_created) {
            throw new Error('Registration application sent - awaiting approval');
          }
          throw new Error('No JWT in response');
        }

        if (!isMounted) return;

        // Store JWT in auth store (same as regular login)
        addAccount({
          instance: instanceUrl,
          jwt: data.jwt,
          username: data.username || 'OAuth User',
        });

        updateSelectedAccount({
          instance: instanceUrl,
        });

        // Clean up OAuth state
        localStorage.removeItem('oauth_state');

        console.log('✅ [OAuth Callback] Login complete, redirecting...');
        setStatus('success');

        // Redirect to home after short delay
        timeoutId = setTimeout(() => {
          if (isMounted) {
            router.push('/home');
          }
        }, 500);

      } catch (err: any) {
        console.error('❌ [OAuth Callback] Error:', err);
        if (!isMounted) return;
        
        setError(err.message || 'OAuth login failed');
        setStatus('error');

        // Clean up failed OAuth state
        localStorage.removeItem('oauth_state');

        // Redirect back to home after delay (auth modal will open)
        timeoutId = setTimeout(() => {
          if (isMounted) {
            router.push('/home');
          }
        }, 3000);
      }
    };

    handleCallback();

    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [router, updateSelectedAccount, addAccount]);

  // Render status UI
  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-8">
        <Spinner className="w-12 h-12 text-primary" />
        <h2 className="text-xl font-semibold">Completing sign in...</h2>
        <p className="text-sm text-muted-foreground text-center">
          Please wait while we complete your authentication.
        </p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-8">
        <div className="text-6xl">✅</div>
        <h2 className="text-xl font-semibold">Sign in successful!</h2>
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-8">
        <div className="text-6xl">❌</div>
        <h2 className="text-xl font-semibold">Sign in failed</h2>
        <p className="text-sm text-destructive text-center max-w-md">{error}</p>
        <p className="text-sm text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return null;
}
