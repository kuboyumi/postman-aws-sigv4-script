# Postman Scripts for AWS Signature V4

This repository contains Postman scripts to automate the process of authenticating with AWS services (API Gateway, Lambda, CloudFront) using **AWS Signature Version 4 (SigV4)**.

## 💡 Why use this?

Postman's built-in AWS Auth works great for direct AWS calls. However, it struggles in the following scenario:

- **Target URL:** `https://api.example.com` (Custom Domain / CNAME)
- **Actual AWS Host:** `xxx.execute-api.ap-northeast-1.amazonaws.com`

To successfully authenticate with IAM, you must send the request to the Custom Domain URL, but the signature must be calculated using the original AWS Hostname in the `Host` header. This script handles that complexity automatically.

## 📂 Included Scripts

| File | Description | Usage |
| :--- | :--- | :--- |
| `pre-request-script.js` | Calculates AWS SigV4 signature and handles the Host header swap. | **Pre-request Script** tab |
| `post-response-script.js` | (Optional) Helper to auto-save credentials from a Login API response. | **Post-response** (or **Tests**) tab of Login API |

## 🚀 Setup

### 1. Environment Variables
Create an Environment in Postman and define the following variables:

| Variable | Description |
| :--- | :--- |
| `accessKeyId` | AWS Access Key ID |
| `secretKey` | AWS Secret Access Key |
| `sessionToken` | (Optional) AWS Session Token |
| `awsRegion` | AWS Region (Default: `ap-northeast-1`) |
| `baseUrl` | Your API base URL (e.g., `https://api.example.com`) |

### 2. Configure Pre-request Script (Required)
Paste the content of `pre-request-script.js` into the **Pre-request Script** tab of your Collection or Folder.

**⚠️ Important:** You must update the `HOST_MAPPING` constant in the script to map your `baseUrl` to the actual AWS API Gateway endpoint:

```javascript
const HOST_MAPPING = {
    // 'Postman baseUrl' : 'Real AWS Hostname'
    '[https://dev.example.com](https://dev.example.com)': 'dev-xxx.execute-api.ap-northeast-1.amazonaws.com',
    '[https://prod.example.com](https://prod.example.com)': 'prod-xxx.execute-api.ap-northeast-1.amazonaws.com'
};
```

## ⚡ Automation (Optional)

If you have a Login API that returns temporary AWS credentials, you can automate variable updates.

1.  Open your **Login Request** in Postman.
2.  Go to the **Post-response** (or **Tests**) tab.
3.  Paste the content of `post-response-script.js`.
4.  Modify the JSON path to match your API response:
    ```javascript
    // Example
    const creds = pm.response.json().credential; 
    pm.environment.set("accessKeyId", creds.AccessKeyId);
    ```

## License
MIT License

