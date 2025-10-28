import { splitMainFeed } from '../utils/index.js'

console.log('Splitting main feed into separate files...')

try {
  const result = splitMainFeed()
  
  console.log('✅ Feeds created successfully!')
  console.log(`📦 Releases: ${result.releases.length} items`)
  console.log(`📋 Issues: ${result.issues.length} items`)
  console.log(`💬 Discussions: ${result.discussions.length} items`)
  console.log(`📊 Retrospectives: ${result.retrospectives.length} items`)
  
} catch (error) {
  console.error('❌ Error:', error.message)
  process.exit(1)
}