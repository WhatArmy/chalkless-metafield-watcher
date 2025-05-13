# Metafield Watcher – Node.js on AWS Elastic Beanstalk

## Description
A Node.js application for monitoring Shopify metafields, handling webhooks, sending email notifications, and integrating with MongoDB. Ready for deployment on AWS Elastic Beanstalk, with automatic SSL (Let's Encrypt) and custom domain support.

---

## Quick Start (Local)

1. Clone the repository and install dependencies:
   ```sh
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your configuration:
   ```sh
   cp .env.example .env
   # Edit .env with your values
   ```
3. Start the application:
   ```sh
   npm start
   ```

---

## Deployment on AWS Elastic Beanstalk

1. **Ensure your project contains:**
   - `package.json`, `index.js`, `Procfile`, `.env.example`, `.ebextensions/`, `.platform/hooks/postdeploy/`
2. **Create a `Procfile`** (if it does not exist):
   ```
   web: node index.js
   ```
3. **Zip the contents of your project directory** (do not zip the root folder, only the files and subfolders inside).
4. **Upload the ZIP to Elastic Beanstalk** using the AWS Console.
5. **Set environment variables** in the EB console or via `.ebextensions/env.config`.
6. **(Optional) Configure a custom domain:**
   - Point your domain to the EB environment (A or CNAME record).
   - Edit `.platform/hooks/postdeploy/01_certbot_ssl.sh` and set `DOMAIN` and `EMAIL`.
   - The script will automatically obtain an SSL certificate from Let's Encrypt after deployment.

---

## SSL and Custom Domain

- HTTP→HTTPS redirection is configured in `.ebextensions/https-redirect.config`.
- Let's Encrypt SSL certificate is obtained automatically by the postdeploy hook.
- Edit domain and email in `.platform/hooks/postdeploy/01_certbot_ssl.sh`.

---

## Environment Variables
All required environment variables are listed in `.env.example`.

---

## Support
If you need help with deployment or configuration, contact the project author.
