#!/bin/bash
# Deployment Package Builder for Hostinger
# This script creates an optimized ZIP package for Hostinger deployment
# Run from project root: bash build-deployment-package.sh

set -e  # Exit on error

echo "════════════════════════════════════════════════════════════════"
echo "  Tina Yene Bakery - Hostinger Deployment Package Builder"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="tina-bakery-hostinger-deploy"
ZIP_NAME="tina-bakery-hostinger.zip"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_ZIP="${ZIP_NAME%.zip}_${TIMESTAMP}.zip"

echo -e "${YELLOW}Step 1: Pre-flight checks${NC}"
echo "───────────────────────────────────────────────────────────────"

# Check if in project root
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi
echo -e "${GREEN}✓ Found package.json${NC}"

# Check if .next directory exists
if [ ! -d ".next" ]; then
    echo -e "${YELLOW}⚠ Warning: .next directory not found${NC}"
    echo "Running: pnpm run build"
    pnpm run build
fi
echo -e "${GREEN}✓ Found .next directory${NC}"

# Check if previous deployment exists
if [ -f "$ZIP_NAME" ]; then
    echo -e "${YELLOW}⚠ Previous deployment package found${NC}"
    echo "Creating backup: $BACKUP_ZIP"
    mv "$ZIP_NAME" "$BACKUP_ZIP"
fi

echo ""
echo -e "${YELLOW}Step 2: Preparing deployment directory${NC}"
echo "───────────────────────────────────────────────────────────────"

# Remove old deploy directory if exists
if [ -d "$DEPLOY_DIR" ]; then
    echo "Removing old deployment directory..."
    rm -rf "$DEPLOY_DIR"
fi

# Create deploy directory
mkdir -p "$DEPLOY_DIR"
echo -e "${GREEN}✓ Created deployment directory${NC}"

echo ""
echo -e "${YELLOW}Step 3: Copying application files${NC}"
echo "───────────────────────────────────────────────────────────────"

# Copy directories
echo "Copying source directories..."
directories=(".next" "public" "prisma" "lib" "app" "components" "store" "hooks" "styles" "scripts")
for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        cp -r "$dir" "$DEPLOY_DIR/"
        echo -e "${GREEN}✓ Copied $dir${NC}"
    else
        echo -e "${YELLOW}⚠ Skipped $dir (not found)${NC}"
    fi
done

# Copy configuration files
echo ""
echo "Copying configuration files..."
config_files=("package.json" "pnpm-lock.yaml" "next.config.mjs" "tsconfig.json" "tailwind.config.ts" "postcss.config.mjs" "proxy.ts")
for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$DEPLOY_DIR/"
        echo -e "${GREEN}✓ Copied $file${NC}"
    else
        echo -e "${YELLOW}⚠ Skipped $file (not found)${NC}"
    fi
done

# Copy optional documentation
echo ""
echo "Copying documentation..."
if [ -f "README.md" ]; then
    cp "README.md" "$DEPLOY_DIR/"
    echo -e "${GREEN}✓ Copied README.md${NC}"
fi

echo ""
echo -e "${YELLOW}Step 4: Verification${NC}"
echo "───────────────────────────────────────────────────────────────"

# Count files
file_count=$(find "$DEPLOY_DIR" -type f | wc -l)
dir_count=$(find "$DEPLOY_DIR" -type d | wc -l)

echo "Files copied: $file_count"
echo "Directories: $dir_count"

# Check critical files
critical_files=("package.json" ".next" "prisma" "lib" "app" "components" "public")
missing=0
for file in "${critical_files[@]}"; do
    if [ ! -e "$DEPLOY_DIR/$file" ]; then
        echo -e "${RED}✗ Missing: $file${NC}"
        missing=$((missing + 1))
    else
        echo -e "${GREEN}✓ Found: $file${NC}"
    fi
done

if [ $missing -gt 0 ]; then
    echo -e "${RED}❌ Critical files missing. Aborting.${NC}"
    rm -rf "$DEPLOY_DIR"
    exit 1
fi

echo ""
echo -e "${YELLOW}Step 5: Creating ZIP package${NC}"
echo "───────────────────────────────────────────────────────────────"

# Create ZIP file
zip -r -q "$ZIP_NAME" "$DEPLOY_DIR"
echo -e "${GREEN}✓ ZIP package created: $ZIP_NAME${NC}"

# Get ZIP size
zip_size=$(ls -lh "$ZIP_NAME" | awk '{print $5}')
echo "Package size: $zip_size"

# Calculate compression ratio
dir_size=$(du -sh "$DEPLOY_DIR" | cut -f1)
echo "Uncompressed size: $dir_size"

# Clean up temporary deployment directory
echo ""
echo "Cleaning up temporary files..."
rm -rf "$DEPLOY_DIR"
echo -e "${GREEN}✓ Removed temporary deployment directory${NC}"

echo ""
echo -e "${YELLOW}Step 6: Creating deployment guide${NC}"
echo "───────────────────────────────────────────────────────────────"

# Create deployment instructions
cat > DEPLOYMENT_INSTRUCTIONS.txt << 'EOF'
═══════════════════════════════════════════════════════════════════
  HOSTINGER DEPLOYMENT INSTRUCTIONS
  Tina Yene Bakery Website
═══════════════════════════════════════════════════════════════════

📦 DEPLOYMENT PACKAGE CONTENTS:
  ✓ .next/              - Pre-built Next.js application
  ✓ public/             - Static assets and images
  ✓ prisma/             - Database schema and migrations
  ✓ app/, components/   - Application source code
  ✓ lib/, store/, etc.  - Utilities and libraries
  ✓ Configuration files - next.config.mjs, tsconfig.json, etc.
  ✓ package.json        - Dependencies manifest
  ✓ pnpm-lock.yaml      - Locked dependency versions

⚠️  NOT INCLUDED:
  ✗ node_modules/       - Will be installed on server
  ✗ .env                - Must be created on server
  ✗ .git/               - Version control not needed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 PRE-DEPLOYMENT CHECKLIST:

[ ] 1. DATABASE SETUP
    - [ ] Create MySQL database: tina_bakery_prod
    - [ ] Create MySQL database: tina_bakery_shadow
    - [ ] Create MySQL user with full privileges
    - [ ] Note: host, user, password

[ ] 2. ENVIRONMENT VARIABLES READY
    - [ ] DATA_BASE_URL
    - [ ] SHADOW_DATA_BASE_URL
    - [ ] NEXTAUTH_SECRET (generate: openssl rand -hex 32)
    - [ ] STRIPE_SECRET_KEY
    - [ ] STRIPE_WEBHOOK_SECRET
    - [ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    - [ ] EMAIL_HOST, EMAIL_USER, EMAIL_PASS
    - [ ] NEXT_PUBLIC_BASE_URL

[ ] 3. STRIPE CONFIGURATION
    - [ ] Get test keys from Stripe dashboard
    - [ ] Get webhook secret for test endpoint
    - [ ] Webhook endpoint: https://yourdomain.com/api/webhooks/stripe

[ ] 4. EMAIL/SMTP
    - [ ] Test Hostinger SMTP credentials locally
    - [ ] Confirm sender email verified
    - [ ] Have SMTP details: host, port, user, pass

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 DEPLOYMENT STEPS:

1. UPLOAD ZIP FILE
   - Use cPanel File Manager or FTP
   - Upload to: public_html/
   - Extract ZIP file
   - Verify files extracted correctly

2. INSTALL DEPENDENCIES
   SSH into server or use cPanel Terminal:
   
   cd ~/public_html/tina-bakery-hostinger-deploy
   pnpm install --prod
   
   (This installs production dependencies only, ~2-5 minutes)

3. SET UP ENVIRONMENT
   
   nano .env
   
   Paste values from your environment variables document.
   Save: Ctrl+X, Y, Enter

4. RUN MIGRATIONS
   
   npx prisma generate
   npx prisma migrate deploy
   
   (This creates all database tables)

5. CREATE FIRST ADMIN USER
   
   curl -X POST https://yourdomain.com/api/admin/users \
     -H "Authorization: Basic $(echo -n 'admin:password' | base64)" \
     -H "Content-Type: application/json" \
     -d '{
       "username": "admin",
       "password": "YourStrongPassword123!",
       "role": "admin"
     }'

6. START APPLICATION
   
   Option A (Recommended): Use cPanel Node.js App
   - Go to cPanel → Setup Node.js App
   - Create app with:
     * App name: tina-bakery
     * Document root: /public_html/tina-bakery-hostinger-deploy
     * Startup file: npm start
     * Node.js version: 20.x
   - Click Create (starts automatically)
   
   Option B (Manual):
   npm start

7. VERIFY RUNNING
   
   curl http://localhost:3000
   (Should return HTML)
   
   curl -I https://yourdomain.com
   (Should return HTTP 200)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧪 TESTING CHECKLIST:

[ ] Website accessible at https://yourdomain.com
[ ] Homepage loads without errors
[ ] Shop page displays products
[ ] Product detail page works
[ ] Cart functionality works
[ ] Admin login works (https://yourdomain.com/yeneAdmin/login)
[ ] Create product in admin
[ ] Contact form submits
[ ] Contact form email received
[ ] Add to cart and checkout (test mode)
[ ] Use test card: 4242 4242 4242 4242
[ ] Order appears in admin
[ ] Order confirmation email received

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚙️  GOING LIVE:

1. Switch Stripe to Live Mode
   - Get live keys from Stripe dashboard
   - Update .env:
     STRIPE_SECRET_KEY=sk_live_xxxxx
     STRIPE_WEBHOOK_SECRET=whsec_xxxxx
     NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
   - Restart application

2. Configure DNS
   - Point domain to Hostinger
   - Wait for propagation (5-30 min)
   - Verify: dig yourdomain.com

3. Enable HTTPS
   - Enable AutoSSL in cPanel
   - Verify certificate valid

4. Set Up Monitoring
   - Sentry for error tracking
   - Uptime Robot for keep-alive pings
   - Monitor Stripe webhooks

5. Enable Backups
   - cPanel → Backups
   - Enable automated daily backups

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🆘 TROUBLESHOOTING:

Database Connection Error:
  → Check DATA_BASE_URL in .env
  → Verify credentials in cPanel MySQL
  → Test: mysql -h host -u user -p database_name

Email Not Sending:
  → Verify EMAIL_HOST, EMAIL_USER, EMAIL_PASS
  → Test SMTP credentials locally
  → Check sender email verified in cPanel

Stripe Webhooks Not Working:
  → Check webhook endpoint URL in Stripe dashboard
  → Verify SSL certificate valid (HTTPS working)
  → Check Stripe webhook delivery status
  → Verify STRIPE_WEBHOOK_SECRET matches

Admin Login Fails:
  → Verify NEXTAUTH_SECRET set (32+ chars)
  → Clear browser cookies
  → Check admin user created in database
  → Verify NEXTAUTH_URL matches domain

Application Won't Start:
  → Check logs: npm start 2>&1 | tail -50
  → Verify .env file exists and is readable
  → Run migrations again: npx prisma migrate deploy
  → Check port 3000 not in use

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 SUPPORT:

For detailed deployment guide, see: HOSTINGER_DEPLOYMENT_ASSESSMENT.md
For environment variables template: ENVIRONMENT_VARIABLES_TEMPLATE.txt

═══════════════════════════════════════════════════════════════════
EOF

echo -e "${GREEN}✓ Created DEPLOYMENT_INSTRUCTIONS.txt${NC}"

# Create environment variables template
cat > ENVIRONMENT_VARIABLES_TEMPLATE.txt << 'EOF'
# Tina Yene Bakery - Environment Variables Template
# Copy these variables to your .env file on Hostinger
# Replace values marked with [...] with actual values

═══════════════════════════════════════════════════════════════════
DATABASE CONFIGURATION
═══════════════════════════════════════════════════════════════════
# Main database (from cPanel MySQL Databases)
DATA_BASE_URL=mysql://[USERNAME]:[PASSWORD]@[HOST]:3306/[DATABASE_NAME]

# Shadow database for Prisma migrations (create in cPanel)
SHADOW_DATA_BASE_URL=mysql://[USERNAME]:[PASSWORD]@[HOST]:3306/[SHADOW_DATABASE_NAME]

Example:
DATA_BASE_URL=mysql://yene_user:MyPassword123@localhost:3306/yene_bakery
SHADOW_DATA_BASE_URL=mysql://yene_user:MyPassword123@localhost:3306/yene_shadow

═══════════════════════════════════════════════════════════════════
AUTHENTICATION
═══════════════════════════════════════════════════════════════════
# Generate with: openssl rand -hex 32
NEXTAUTH_SECRET=[32+ character random string]
NEXTAUTH_URL=https://yourdomain.com

Example:
NEXTAUTH_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
NEXTAUTH_URL=https://bakery.yourdomain.com

═══════════════════════════════════════════════════════════════════
STRIPE PAYMENT PROCESSING
═══════════════════════════════════════════════════════════════════
# Get from Stripe Dashboard → Developers → API Keys
STRIPE_SECRET_KEY=[From Stripe Dashboard - Secret Key]
STRIPE_WEBHOOK_SECRET=[From Stripe Dashboard - Webhooks endpoint]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[From Stripe Dashboard - Publishable Key]

# During development, use test keys (sk_test_, pk_test_)
# Before going live, switch to live keys (sk_live_, pk_live_)

Example (Test):
STRIPE_SECRET_KEY=sk_test_51234567890abcdefghijklmnop
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdefghijklmnop
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51234567890abcdefghijklmnop

═══════════════════════════════════════════════════════════════════
EMAIL / SMTP CONFIGURATION
═══════════════════════════════════════════════════════════════════
# Get SMTP details from:
# 1. Hostinger cPanel → Email Accounts → Configure Client
# 2. Or from email provider documentation

EMAIL_HOST=[SMTP server address]
EMAIL_PORT=[SMTP port, usually 587]
EMAIL_USER=[Sender email address]
EMAIL_PASS=[SMTP password]
SMTP_SECURE=[false for STARTTLS (port 587), true for SSL (port 465)]

Example (Hostinger):
EMAIL_HOST=mail.yourdomain.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASS=YourSmtpPassword123
SMTP_SECURE=false

═══════════════════════════════════════════════════════════════════
BASE URLS (APPLICATION DOMAIN)
═══════════════════════════════════════════════════════════════════
# Your production domain
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# These are used for:
# - Email confirmation links
# - Stripe return URLs
# - Sitemap and robots.txt
# - SEO metadata

Example:
NEXT_PUBLIC_BASE_URL=https://bakery.yourdomain.com
NEXT_PUBLIC_SITE_URL=https://bakery.yourdomain.com

═══════════════════════════════════════════════════════════════════
CACHE REVALIDATION
═══════════════════════════════════════════════════════════════════
# Generate with: openssl rand -hex 32
REVALIDATE_SECRET=[32+ character random string]

# Used by admin panel to revalidate cached pages
# Example: After updating a product, revalidate product pages

═══════════════════════════════════════════════════════════════════
ADMIN CREDENTIALS (FOR INITIAL SETUP)
═══════════════════════════════════════════════════════════════════
# Used to create the first admin user via API
# Change these after creating first admin!

ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourAdminPassword123!

# After deployment, create admin user:
# curl -X POST https://yourdomain.com/api/admin/users \
#   -H "Authorization: Basic $(echo -n 'admin:password' | base64)" \
#   -H "Content-Type: application/json" \
#   -d '{
#     "username": "yourusername",
#     "password": "StrongPassword123!",
#     "role": "admin"
#   }'

═══════════════════════════════════════════════════════════════════
ENVIRONMENT & FEATURE FLAGS
═══════════════════════════════════════════════════════════════════
# Production environment - enable optimizations
NODE_ENV=production

# Feature flags (set to true to enable)
NEXT_PUBLIC_COMING_SOON=false
NEXT_PUBLIC_COMING_SOON_TARGET_DATE=2025-01-01
NEXT_PUBLIC_MAINTENANCE_MODE=false

═══════════════════════════════════════════════════════════════════
QUICK REFERENCE
═══════════════════════════════════════════════════════════════════

Total variables needed: 15
Critical variables: 11
Optional/with defaults: 4

Setup time: 10-15 minutes
Complexity: Low

After getting all values, create .env file on server:
nano .env
[Paste all values above]
[Ctrl+X, Y, Enter to save]

═══════════════════════════════════════════════════════════════════
EOF

echo -e "${GREEN}✓ Created ENVIRONMENT_VARIABLES_TEMPLATE.txt${NC}"

echo ""
echo -e "${YELLOW}Step 7: Summary${NC}"
echo "───────────────────────────────────────────────────────────────"
echo ""
echo -e "${GREEN}✅ Deployment package created successfully!${NC}"
echo ""
echo "📦 Package Information:"
echo "   File: $ZIP_NAME"
echo "   Size: $zip_size"
echo "   Files: $file_count"
echo "   Directories: $dir_count"
echo ""
echo "📋 Files Created:"
echo "   - $ZIP_NAME (ready to upload)"
echo "   - DEPLOYMENT_INSTRUCTIONS.txt (step-by-step guide)"
echo "   - ENVIRONMENT_VARIABLES_TEMPLATE.txt (env vars template)"
echo ""
echo "🚀 Next Steps:"
echo "   1. Read DEPLOYMENT_INSTRUCTIONS.txt"
echo "   2. Prepare all environment variables"
echo "   3. Upload $ZIP_NAME to Hostinger"
echo "   4. Follow deployment steps"
echo "   5. Test thoroughly before going live"
echo ""
echo "📖 For detailed guidance, see:"
echo "   HOSTINGER_DEPLOYMENT_ASSESSMENT.md"
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Ready for deployment! ✨"
echo "════════════════════════════════════════════════════════════════"
