#!/bin/bash
# AWS EB postdeploy hook: automatic Let's Encrypt SSL for custom domain
# Requires: domain points to this EB environment
# Set DOMAIN and EMAIL below
DOMAIN="chalkless.whatarmy.dev"
EMAIL="c2p@whatarmydev.com"

# Install certbot if not present
if ! command -v certbot &> /dev/null; then
  sudo yum install -y epel-release
  sudo yum install -y certbot python2-certbot-nginx
fi

# Obtain/renew certificate
sudo certbot --nginx --non-interactive --agree-tos --email "$EMAIL" -d "$DOMAIN"

# Reload nginx to apply new cert
sudo systemctl reload nginx
