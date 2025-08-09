
# Tax Filing Application - Railway Deployment Guide

A comprehensive tax filing application with document OCR processing, form extraction, and automated tax calculations.

## Features

- **Document Processing**: Automated OCR for W-2, 1099, and other tax documents
- **Form Extraction**: Intelligent data extraction from tax forms
- **Tax Calculations**: Complete tax return calculations with Form 1040 generation
- **User Authentication**: Secure authentication with NextAuth.js
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Modern React/Next.js interface with Tailwind CSS

## Technology Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS, Radix UI
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js
- **OCR Processing**: Google Cloud Document AI, Tesseract.js
- **File Processing**: PDF processing, Sharp for image handling

## Railway Deployment

### Prerequisites

Before deploying to Railway, ensure you have:

1. A Railway account
2. Railway CLI installed (optional)
3. A PostgreSQL database service on Railway

### Environment Variables

The application requires the following environment variables to be set in Railway:

#### Required Variables

```bash
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# NextAuth Configuration
NEXTAUTH_URL="https://your-app-name.railway.app"
NEXTAUTH_SECRET="your-secure-random-secret-key-here"

# AbacusAI API (for LLM processing)
ABACUSAI_API_KEY="your_abacusai_api_key_here"
```

#### Optional Variables (Google Cloud Document AI)

If you want to use Google Cloud Document AI for enhanced OCR:

```bash
GOOGLE_CLOUD_PROJECT_ID="your-google-cloud-project-id"
GOOGLE_CLOUD_LOCATION="us"
GOOGLE_CLOUD_W2_PROCESSOR_ID="your-w2-processor-id"
GOOGLE_CLOUD_1099_PROCESSOR_ID="your-1099-processor-id"
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type": "service_account", "project_id": "your-project-id", ...}'
```

**Note**: For Google Cloud credentials, set `GOOGLE_APPLICATION_CREDENTIALS_JSON` as a JSON string containing your service account key content.

### Deployment Steps

#### Method 1: Using Railway Dashboard

1. **Create a new Railway project**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Choose "Deploy from GitHub repo" (if using Git) or "Empty Project"

2. **Add PostgreSQL Database**
   - In your Railway project, click "New"
   - Select "Database" → "PostgreSQL"
   - This will automatically set the `DATABASE_URL` environment variable

3. **Deploy the Application**
   - Click "New" → "GitHub Repo" (or upload this code)
   - Select your repository
   - Railway will automatically detect the Next.js app and use the `railway.json` configuration

4. **Set Environment Variables**
   - In your service settings, go to "Variables"
   - Add all the required environment variables listed above

5. **Database Migration**
   - The database will be automatically migrated on first deploy via the build process
   - If you need to run migrations manually, use Railway's console:
     ```bash
     npx prisma migrate deploy
     ```

#### Method 2: Using Railway CLI

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Railway Project**
   ```bash
   railway init
   ```

4. **Add PostgreSQL Database**
   ```bash
   railway add postgresql
   ```

5. **Set Environment Variables**
   ```bash
   railway variables set NEXTAUTH_SECRET="your-secret-here"
   railway variables set NEXTAUTH_URL="https://your-app.railway.app"
   railway variables set ABACUSAI_API_KEY="your-api-key-here"
   ```

6. **Deploy**
   ```bash
   railway up
   ```

### Post-Deployment Setup

1. **Verify Database Migration**
   - Check Railway logs to ensure Prisma migrations ran successfully
   - The application will automatically run `prisma generate` and migrations during build

2. **Test the Application**
   - Visit your deployed application URL
   - Test user registration/login
   - Try uploading a tax document to verify OCR functionality

3. **Monitor Performance**
   - Check Railway dashboard for metrics and logs
   - Monitor database usage and performance

### Configuration Details

#### Build Configuration

The application uses the following build configuration (defined in `railway.json`):

- **Builder**: Nixpacks (automatically detects Next.js)
- **Build Command**: `npm run build` (includes Prisma generation)
- **Start Command**: Automatically detected from `package.json`

#### Database Schema

The application uses Prisma with the following main models:

- **User**: User authentication and profile data
- **TaxReturn**: Main tax return data with all calculations
- **Document**: Uploaded tax documents with OCR results
- **IncomeEntry**: W-2 wages, 1099 income, and other income types
- **DeductionEntry**: Various tax deductions
- **Dependent**: Dependent information for tax credits

### Troubleshooting

#### Common Issues

1. **Database Connection Errors**
   - Ensure `DATABASE_URL` is correctly set
   - Check if PostgreSQL service is running in Railway

2. **Build Failures**
   - Check Railway logs for specific error messages
   - Ensure all required dependencies are in `package.json`

3. **OCR Not Working**
   - Verify `ABACUSAI_API_KEY` is set correctly
   - For Google Cloud AI: ensure credentials JSON is valid

4. **Authentication Issues**
   - Ensure `NEXTAUTH_SECRET` is set and secure
   - Verify `NEXTAUTH_URL` matches your deployment URL

#### Getting Help

- Check Railway logs in the dashboard
- Review the application logs for specific errors
- Ensure all environment variables are properly configured

### Features Overview

- **Smart Document Processing**: Upload W-2s, 1099s, and other tax documents
- **Automatic Data Extraction**: OCR and intelligent form field mapping
- **Tax Calculations**: Complete tax return calculations with real-time updates
- **Form 1040 Generation**: Generate completed Form 1040 based on entered data
- **Multi-Step Interface**: Guided tax filing process
- **Data Verification**: Review and edit extracted data before filing
- **Secure Storage**: All data encrypted and securely stored

### Security Considerations

- All sensitive data is encrypted in the database
- Authentication handled by NextAuth.js with secure sessions
- File uploads are validated and processed securely
- API routes are protected with authentication middleware

---

For technical support or questions about the tax application, please refer to the application documentation or contact the development team.
