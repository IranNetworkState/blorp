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

        if (!code) {
          throw new Error('Authorization denied or no code received');
        }

        if (!stateParam) {
          throw new Error('No state parameter received');
        }

        // Retrieve stored OAuth state
        const storedStateStr = localStorage.getItem('oauth_state');
        if (!storedStateStr) {
          throw new Error('No OAuth state found in storage');
        }

        const storedState = JSON.parse(storedStateStr);
        console.log('🔍 [OAuth Callback] Stored state:', storedState);

        // Verify state matches (CSRF protection)
        if (stateParam !== storedState.state) {
          throw new Error('State mismatch - possible CSRF attack');
        }

        // Check if state expired
        if (Date.now() > storedState.expires_at) {
          throw new Error('OAuth state expired - please try again');
        }

        console.log('✅ [OAuth Callback] State verified, exchanging code for JWT...');

        // Exchange authorization code for JWT via Lemmy's OAuth endpoint
        const tokenResponse = await fetch(`${storedState.instance}/api/v4/user/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username_or_email: `oauth:${storedState.provider_id}:${code}`,
            password: code,
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `Token exchange failed: ${tokenResponse.status}`);
        }

        const data = await tokenResponse.json();
        console.log('✅ [OAuth Callback] JWT received');

        if (!data.jwt) {
          throw new Error('No JWT in response');
        }

        if (!isMounted) return;

        // Store JWT in auth store (same as regular login)
        addAccount({
          instance: storedState.instance,
          jwt: data.jwt,
          username: data.username || 'OAuth User',
        });

        updateSelectedAccount({
          instance: storedState.instance,
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
