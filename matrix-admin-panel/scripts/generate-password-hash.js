const bcrypt = require('bcryptjs')

async function generatePasswordHash() {
  const password = process.argv[2]
  
  if (!password) {
    console.log('Usage: node scripts/generate-password-hash.js <password>')
    console.log('Example: node scripts/generate-password-hash.js mySecurePassword123')
    process.exit(1)
  }

  try {
    const saltRounds = 12
    const hash = await bcrypt.hash(password, saltRounds)
    
    console.log('\n=== ADMIN PASSWORD HASH GENERATED ===')
    console.log('Add this to your .env.local file:')
    console.log(`ADMIN_PASSWORD_HASH=${hash}`)
    console.log('\n⚠️  Security Note: Keep this hash secure and never commit it to version control!')
  } catch (error) {
    console.error('Error generating hash:', error)
    process.exit(1)
  }
}

generatePasswordHash()