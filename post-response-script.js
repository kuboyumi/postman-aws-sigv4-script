// ==========================================
// Auto-Save AWS Credentials
// ==========================================

// Ensure the request was successful before updating variables
if (pm.response.code === 200) {
    try {
        const res = pm.response.json();

        // --------------------------------------------------------
        // TODO: Adjust the path 'res.credential' to match your API response
        // e.g., if response is { "data": { "AccessKeyId": "..." } }, use res.data
        // --------------------------------------------------------
        const creds = res.credential; 

        if (creds && creds.AccessKeyId && creds.SecretKey) {
            pm.environment.set("accessKeyId", creds.AccessKeyId);
            pm.environment.set("secretKey", creds.SecretKey);
            
            // SessionToken is optional; set it only if it exists
            if (creds.SessionToken) {
                pm.environment.set("sessionToken", creds.SessionToken);
            }
            
            console.log("✅ AWS Credentials updated in Environment.");
        } else {
            console.warn("⚠️ Credentials not found in response. Check the JSON path in Post-response script.");
        }
    } catch (e) {
        console.error("❌ Failed to parse JSON:", e);
    }
}

