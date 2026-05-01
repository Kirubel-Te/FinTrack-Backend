try {
  const { execSync } = require('child_process');
  execSync('npx prisma generate', { stdio: 'inherit' });
} catch (e) {
  // If Prisma CLI isn't available in this environment, skip generation silently.
  // This avoids postinstall failures in production where devDependencies aren't installed.
  // Any environment deploying should run `npx prisma generate` during build if needed.
}
