// ==========================================
// AWS Signature V4 Generator for Postman
// ==========================================

// --- Configuration ---
const DEBUG_MODE = true; // Set to true to debug 403 errors in Console

// HOST_MAPPING: Maps your "Custom Domain" (baseUrl) to the "Real AWS Host"
// This is critical because we send the request to the Custom Domain,
// but we must sign the request as if it is going to the AWS internal host.
const HOST_MAPPING = {
    'https://dev.example.com':     'dev-api-id.execute-api.ap-northeast-1.amazonaws.com',
    'https://staging.example.com': 'staging-api-id.execute-api.ap-northeast-1.amazonaws.com',
    'https://prod.example.com':    'prod-api-id.execute-api.ap-northeast-1.amazonaws.com'
};

const currentBaseUrl = pm.variables.get('baseUrl');
// Fallback: Use a default host if the baseUrl is not in the map
const targetHost = HOST_MAPPING[currentBaseUrl] || Object.values(HOST_MAPPING)[0];

const awsConfig = {
    accessKey: pm.environment.get('accessKeyId'),
    secretKey: pm.environment.get('secretKey'),
    token:     pm.environment.get('sessionToken'),
    region:    pm.environment.get('awsRegion') || 'ap-northeast-1',
    service:   'execute-api',
    host:      targetHost
};

// --- Helper Functions ---
const crypto = require('crypto-js');
const sha256 = (msg) => crypto.SHA256(msg).toString(crypto.enc.Hex);
const hmac = (key, msg) => crypto.HmacSHA256(msg, key);

// Generate AWS Date format (YYYYMMDD'T'HHMMSS'Z')
const now = new Date();
const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '');
const dateStamp = amzDate.substr(0, 8);

// --- Step 1: Create Canonical Request ---

// A. Headers
// We explicitly define the headers to sign. 'host' and 'x-amz-date' are mandatory.
const headersToSign = {
    'host': awsConfig.host,
    'x-amz-date': amzDate
};
if (awsConfig.token) {
    headersToSign['x-amz-security-token'] = awsConfig.token;
}

const sortedHeaderKeys = Object.keys(headersToSign).map(k => k.toLowerCase()).sort();
const canonicalHeaders = sortedHeaderKeys.map(k => `${k}:${headersToSign[k]}\n`).join('');
const signedHeaders = sortedHeaderKeys.join(';');

// B. Query Parameters
// Sort by key, then value. Handle empty/null values strictly.
const canonicalQueryString = pm.request.url.query
    .filter(q => !q.disabled)
    .map(q => {
        const key = encodeURIComponent(q.key);
        // Handle "value=0" correctly (don't treat 0 as falsey)
        const val = (q.value !== undefined && q.value !== null) ? encodeURIComponent(q.value) : '';
        return { key, val };
    })
    .sort((a, b) => a.key.localeCompare(b.key) || a.val.localeCompare(b.val))
    .map(q => `${q.key}=${q.val}`)
    .join('&');

// C. URI Path
// Normalize path: ensure leading slash and proper encoding
let path = pm.request.url.getPath();
if (!path.startsWith('/')) path = '/' + path;
// Encode each segment to handle special characters, but keep slashes
const canonicalUri = path.split('/').map(segment => encodeURIComponent(segment)).join('/').replace(/\+/g, '%20');

// D. Payload (Body)
const requestBody = (pm.request.body && pm.request.body.toString()) ? pm.request.body.toString() : '';
const payloadHash = sha256(requestBody);

// E. Combine
const canonicalRequest = [
    pm.request.method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
].join('\n');

// --- Step 2: Create String to Sign ---
const algorithm = 'AWS4-HMAC-SHA256';
const credentialScope = `${dateStamp}/${awsConfig.region}/${awsConfig.service}/aws4_request`;
const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256(canonicalRequest)
].join('\n');

// --- Step 3: Calculate Signature ---
const kDate    = hmac("AWS4" + awsConfig.secretKey, dateStamp);
const kRegion  = hmac(kDate, awsConfig.region);
const kService = hmac(kRegion, awsConfig.service);
const kSigning = hmac(kService, "aws4_request");
const signature = hmac(kSigning, stringToSign).toString(crypto.enc.Hex);

// --- Step 4: Add Headers to Request ---
const authHeader = `${algorithm} Credential=${awsConfig.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

// Use upsert to avoid duplicates
pm.request.headers.upsert({ key: 'x-amz-date', value: amzDate });
pm.request.headers.upsert({ key: 'host', value: awsConfig.host });
if (awsConfig.token) {
    pm.request.headers.upsert({ key: 'x-amz-security-token', value: awsConfig.token });
}
pm.request.headers.upsert({ key: 'Authorization', value: authHeader });

// --- Debug Output ---
if (DEBUG_MODE) {
    console.log('--- AWS V4 Auth Debug ---');
    console.log('Canonical Request:\n', canonicalRequest);
    console.log('String to Sign:\n', stringToSign);
    console.log('Authorization Header:\n', authHeader);
}

