
#!/bin/bash

# Railway deployment script
echo "🚀 Starting Railway deployment setup..."

# Make sure we're in the right directory
cd "$(dirname "$0")/.."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run database migrations (in production)
if [ "$NODE_ENV" = "production" ]; then
  echo "🗄️ Running database migrations..."
  npx prisma migrate deploy
fi

# Build the application
echo "🏗️ Building application..."
npm run build

echo "✅ Deployment setup completed successfully!"
