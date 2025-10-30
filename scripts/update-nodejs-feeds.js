import { collectAll } from '../news-feeder/collector.js'

// Simple CLI script to update Node.js feeds
collectAll()
  .then(result => {
    console.log('\n🎉 All feeds updated successfully!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Error:', error.message)
    process.exit(1)
  })