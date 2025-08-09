
#!/usr/bin/env node

// Post-install script for production deployments
const { execSync } = require('child_process');

console.log('🚀 Running post-install setup...');

try {
  // Generate Prisma Client
  console.log('📦 Generating Prisma Client...');
  execSync('prisma generate', { stdio: 'inherit' });
  
  console.log('✅ Post-install setup completed successfully!');
} catch (error) {
  console.error('❌ Post-install setup failed:', error.message);
  process.exit(1);
}
