import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const configFile = join(process.cwd(), 'news-feeder', 'config.json')

export function getConfig() {
  return JSON.parse(readFileSync(configFile, 'utf8'))
}

export function getFeedTemplate(feedType) {
  const titles = {
    releases: 'Node.js Releases',
    issues: 'Node.js Issues Updates', 
    discussions: 'Node.js Discussions',
    retrospectives: 'Node.js Retrospectives',
    pullrequests: 'Node.js Pull Requests'
  }
  
  const descriptions = {
    releases: 'Latest Node.js releases',
    issues: 'Node.js team updates',
    discussions: 'Node.js discussions',
    retrospectives: 'Node.js meeting notes and retrospectives',
    pullrequests: 'Latest Node.js pull requests'
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${titles[feedType]}</title>
    <link>https://nodejs.github.io/nodejs-news-feeder/${feedType}.xml</link>
    <atom:link href="https://nodejs.github.io/nodejs-news-feeder/${feedType}.xml" rel="self" type="application/rss+xml"/>
    <description>${descriptions[feedType]}</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <image>
      <title>${titles[feedType]}</title>
      <url>https://nodejs.org/static/images/logo-hexagon-card.png</url>
      <link>https://github.com/nodejs/nodejs-news-feeder</link>
    </image>
    
  </channel>
</rss>`
}

export function createFeedItem({ title, description, pubDate, link, guid }) {
  return `    <item>
      <title>${title}</title>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <link>${link}</link>
      <guid>${guid}</guid>
    </item>
`
}

export function saveFeed(feedType, items) {
  const template = getFeedTemplate(feedType)
  const itemsXml = items.map(item => createFeedItem(item)).join('')
  const feedContent = template.replace('</image>', `</image>\n${itemsXml}`)
  
  const feedPath = join(process.cwd(), 'public', `${feedType}.xml`)
  writeFileSync(feedPath, feedContent, 'utf8')
  
  return items.length
}

export function buildRFC822Date(dateString) {
  const date = new Date(dateString)
  return date.toUTCString()
}