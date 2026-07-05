import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.52.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PushNotificationRequest {
  tokens: string[];
  title: string;
  body: string;
  tipo?: 'info' | 'aviso' | 'urgente' | 'update' | 'broadcast' | 'reminder' | 'inactivity';
  priority?: 'high' | 'normal';
  ttl?: number;
  badge?: number;
  icon?: string;
  image?: string;
  sound?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

interface FCMv1Message {
  message: {
    token: string;
    notification: {
      title: string;
      body: string;
    };
    data: Record<string, string>;
    webpush: {
      notification: {
        title: string;
        body: string;
        icon?: string;
        badge?: string;
        image?: string;
      };
      fcm_options?: {
        link?: string;
      };
      data?: Record<string, string>;
    };
    android: {
      priority: 'HIGH' | 'NORMAL';
      ttl: string;
      notification: {
        channel_id: string;
        sound?: string;
        icon?: string;
        notification_priority: 'PRIORITY_HIGH' | 'PRIORITY_DEFAULT';
      };
    };
  };
}

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

async function base64UrlEncode(data: Uint8Array): Promise<string> {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signJWT(header: string, payload: string, privateKey: string): Promise<string> {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\s/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const algorithm = {
    name: "RSASSA-PKCS1-v1_5",
    hash: "SHA-256",
  };

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    algorithm,
    false,
    ["sign"]
  );

  const dataToSign = `${header}.${payload}`;
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    algorithm,
    key,
    encoder.encode(dataToSign)
  );

  const signatureBase64 = await base64UrlEncode(new Uint8Array(signature));
  return `${dataToSign}.${signatureBase64}`;
}

async function generateJWT(serviceAccount: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: expiry,
    iat: now,
  };

  const encodedHeader = await base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const encodedPayload = await base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );

  return await signJWT(encodedHeader, encodedPayload, serviceAccount.private_key);
}

async function getAccessToken(serviceAccount: ServiceAccount): Promise<string> {
  const now = Date.now();

  if (cachedAccessToken && now < tokenExpiresAt - 300000) {
    return cachedAccessToken;
  }

  const jwt = await generateJWT(serviceAccount);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get access token: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  cachedAccessToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in * 1000);

  return cachedAccessToken;
}

function convertToV1Message(
  token: string,
  title: string,
  body: string,
  tipo: string,
  priority: string,
  ttl: number,
  badge: number | undefined,
  icon: string,
  image: string | undefined,
  sound: string,
  data: Record<string, any> | undefined,
  actions: Array<{ action: string; title: string; icon?: string }> | undefined
): FCMv1Message {
  const channelId = (tipo === 'urgente' || tipo === 'inactivity')
    ? 'urgent_notifications'
    : 'default_notifications';

  const androidPriority = priority === 'high' ? 'HIGH' : 'NORMAL';
  const notificationPriority = (tipo === 'urgente' || tipo === 'inactivity')
    ? 'PRIORITY_HIGH'
    : 'PRIORITY_DEFAULT';

  const messageData: Record<string, string> = {
    title,
    body,
    icon,
    sound,
    tipo,
    priority,
    url: data?.url || "/",
    timestamp: new Date().toISOString(),
  };

  if (badge !== undefined) {
    messageData.badge = badge.toString();
  }

  if (image) {
    messageData.image = image;
  }

  if (actions) {
    messageData.actions = JSON.stringify(actions);
  }

  if (data) {
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'url') {
        messageData[key] = typeof value === 'string' ? value : JSON.stringify(value);
      }
    });
  }

  return {
    message: {
      token,
      notification: {
        title,
        body,
      },
      data: messageData,
      webpush: {
        headers: {
          Urgency: priority === 'high' ? 'high' : 'normal',
          TTL: ttl.toString(),
        },
        notification: {
          title,
          body,
          icon,
          badge: icon,
          image,
        },
        data: messageData,
        fcm_options: {
          link: data?.url || "/",
        },
      },
      android: {
        priority: androidPriority as 'HIGH' | 'NORMAL',
        ttl: `${ttl}s`,
        notification: {
          channel_id: channelId,
          sound,
          icon,
          notification_priority: notificationPriority,
        },
        data: messageData,
      },
    },
  };
}

async function sendWithRetry(
  url: string,
  message: FCMv1Message,
  accessToken: string,
  maxRetries: number = 3
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
        },
        body: JSON.stringify(message),
      });

      if (response.ok) {
        return response;
      }

      if (response.status === 503 || response.status === 429) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.warn(`[SendPush] Retry attempt ${attempt}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

function handleFCMError(errorCode: string): { isPermanent: boolean; shouldDeactivate: boolean } {
  const permanentErrors = [
    'UNREGISTERED',
    'INVALID_ARGUMENT',
    'SENDER_ID_MISMATCH',
  ];

  const retryableErrors = [
    'QUOTA_EXCEEDED',
    'UNAVAILABLE',
    'INTERNAL',
  ];

  const isPermanent = permanentErrors.includes(errorCode);
  const shouldDeactivate = isPermanent;

  return { isPermanent, shouldDeactivate };
}

async function processChunk(
  tokens: string[],
  title: string,
  body: string,
  tipo: string,
  priority: string,
  ttl: number,
  badge: number | undefined,
  icon: string,
  image: string | undefined,
  sound: string,
  data: Record<string, any> | undefined,
  actions: Array<{ action: string; title: string; icon?: string }> | undefined,
  projectId: string,
  accessToken: string,
  supabase: any
): Promise<Array<{ status: 'fulfilled' | 'rejected'; value?: any; reason?: any }>> {
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const results = await Promise.allSettled(
    tokens.map(async (token) => {
      const tokenPreview = token.substring(0, 10);

      const message = convertToV1Message(
        token,
        title,
        body,
        tipo,
        priority,
        ttl,
        badge,
        icon,
        image,
        sound,
        data,
        actions
      );

      try {
        const response = await sendWithRetry(fcmUrl, message, accessToken);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorCode = errorData?.error?.details?.[0]?.errorCode || errorData?.error?.status || 'UNKNOWN';
          const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;

          console.error(`[SendPush] FCM Error for token ${tokenPreview}***: ${errorCode} - ${errorMessage}`);

          const { isPermanent, shouldDeactivate } = handleFCMError(errorCode);

          if (isPermanent) {
            const { data: tokenData } = await supabase
              .from('push_tokens')
              .select('error_count')
              .eq('token', token)
              .single();

            const currentErrorCount = tokenData?.error_count || 0;

            await supabase
              .from('push_tokens')
              .update({
                error_count: currentErrorCount + 1,
                last_error: `FCM v1: ${errorCode} - ${errorMessage}`,
                fcm_error_code: errorCode,
                is_active: shouldDeactivate ? false : undefined,
                updated_at: new Date().toISOString(),
              })
              .eq('token', token);
          }

          throw new Error(`FCM v1 Error: ${errorCode} - ${errorMessage}`);
        }

        const result = await response.json();
        console.log(`[SendPush] Success for token ${tokenPreview}***`);

        await supabase
          .from('push_tokens')
          .update({
            error_count: 0,
            last_error: null,
            fcm_error_code: null,
            last_success_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('token', token);

        return result;
      } catch (error) {
        console.error(`[SendPush] Exception for token ${tokenPreview}***:`, error);
        throw error;
      }
    })
  );

  return results;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const startTime = Date.now();

  try {
    const {
      tokens,
      title,
      body,
      tipo = 'info',
      priority = 'high',
      ttl = 86400,
      badge,
      icon = '/logo_performaxis_tumb.jpg',
      image,
      sound = 'default',
      data,
      actions,
    }: PushNotificationRequest = await req.json();

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: "No tokens provided" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "Title and body are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const serviceAccountJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
    const projectId = Deno.env.get("FIREBASE_PROJECT_ID");

    if (!serviceAccountJson || !projectId) {
      console.error("[SendPush] Firebase credentials not configured");
      return new Response(
        JSON.stringify({
          error: "Firebase credentials not configured",
          details: "Configure FIREBASE_SERVICE_ACCOUNT_JSON and FIREBASE_PROJECT_ID in Supabase Edge Functions Secrets"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);
    const accessToken = await getAccessToken(serviceAccount);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const chunkSize = 50;
    const allResults: Array<{ status: 'fulfilled' | 'rejected'; value?: any; reason?: any }> = [];

    for (let i = 0; i < tokens.length; i += chunkSize) {
      const chunk = tokens.slice(i, i + chunkSize);
      console.log(`[SendPush] Processing chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(tokens.length / chunkSize)}`);

      const chunkResults = await processChunk(
        chunk,
        title,
        body,
        tipo,
        priority,
        ttl,
        badge,
        icon,
        image,
        sound,
        data,
        actions,
        projectId,
        accessToken,
        supabase
      );

      allResults.push(...chunkResults);

      if (i + chunkSize < tokens.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successResults = allResults.filter((r) => r.status === "fulfilled");
    const failedResults = allResults.filter((r) => r.status === "rejected");

    const errors = failedResults.map((r) =>
      r.status === "rejected" ? r.reason.message : "Unknown error"
    );

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / tokens.length;

    console.log(`[SendPush] Completed: ${successResults.length} success, ${failedResults.length} failed in ${totalTime}ms (avg ${avgTime.toFixed(2)}ms per notification)`);

    await supabase.rpc('deactivate_failed_tokens');

    return new Response(
      JSON.stringify({
        success: failedResults.length === 0,
        successCount: successResults.length,
        failureCount: failedResults.length,
        total: tokens.length,
        performance: {
          totalTimeMs: totalTime,
          avgTimePerNotificationMs: parseFloat(avgTime.toFixed(2)),
        },
        errors: errors.length > 0 ? errors : undefined,
        details: allResults.map((r, idx) => ({
          tokenIndex: idx,
          status: r.status,
          ...(r.status === "rejected" && { error: r.reason.message }),
        })),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[SendPush] Fatal error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
