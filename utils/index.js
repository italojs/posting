import { readFileSync, writeFileSync, statSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import * as remark from 'remark'
import remarkHtml from 'remark-html'

const dateRegex = /(\d*-\d*-\d*)/gm
const xmlFile = join(process.cwd(), 'feed.xml')
const configFile = join(process.cwd(), 'config.json')
const websiteFile = join(process.cwd(), 'index.html')
const websiteTemplate = join(process.cwd(), 'templates', 'index.html.ejs')

// Multiple feed files
const feedFiles = {
  issues: join(process.cwd(), 'issues.xml'),
  discussions: join(process.cwd(), 'discussions.xml'),
  releases: join(process.cwd(), 'releases.xml'),
  retrospectives: join(process.cwd(), 'retrospectives.xml')
}

// Cache simples para melhorar performance
const cache = {
  config: null,
  configTimestamp: 0
}

export function md2html (md) {
  return remark.remark().use(remarkHtml).processSync(md).toString()
}

export function buildTitleDate (timestamp) {
  const [date, time] = new Date(timestamp).toISOString().split('T')
  // Format: YYYY-MM-DD HH:MM:SS
  return `${date} ${time.slice(0, 8)}`
}

export function getConfig () {
  try {
    // Cache simples baseado em timestamp do arquivo
    const stats = statSync(configFile)
    const fileTimestamp = stats.mtimeMs
    
    if (cache.config && cache.configTimestamp === fileTimestamp) {
      return cache.config
    }
    
    const config = JSON.parse(readFileSync(configFile, 'utf8'))
    cache.config = config
    cache.configTimestamp = fileTimestamp
    
    return config
  } catch (error) {
    console.error('Erro lendo configuração:', error.message)
    return cache.config || {}
  }
}

export function overwriteConfig (config) {
  try {
    writeFileSync(configFile, JSON.stringify(config, null, 2))
    // Limpa cache após escrita
    cache.config = null
    cache.configTimestamp = 0
  } catch (error) {
    console.error('Erro salvando configuração:', error.message)
    throw error
  }
}

export function composeFeedItem ({ title, description, pubDate, link, guid }) {
  return `
    <item>
      <title>${title}</title>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <link>${link}</link>
      <guid>${guid}</guid>
    </item>
  `
}

export function getFeedContent (feedType = null) {
  if (feedType && feedFiles[feedType]) {
    return readFileSync(feedFiles[feedType], 'utf8')
  }
  return readFileSync(xmlFile, 'utf8')
}

export function getWebsiteTemplate () {
  return readFileSync(websiteTemplate, 'utf8')
}

export function overwriteFeedContent (content, feedType = null) {
  try {
    // Validação básica de XML
    if (!content.includes('<?xml')) {
      console.warn('⚠️ Conteúdo não parece ser XML válido')
    }
    
    // Remove conteúdo problemático comum
    const cleanContent = content
      .replace(/undefined/g, '')  // Remove strings 'undefined'
      .replace(/<\/rss>.*$/s, '</rss>')  // Remove conteúdo após </rss>
      .trim()
    
    if (feedType && feedFiles[feedType]) {
      writeFileSync(feedFiles[feedType], cleanContent)
    } else {
      writeFileSync(xmlFile, cleanContent)
    }
  } catch (error) {
    console.error(`Erro salvando feed ${feedType || 'main'}:`, error.message)
    throw error
  }
}

export function overwriteWebsiteContent (content) {
  writeFileSync(websiteFile, content)
}

export function getFeedHash (feedType = null) {
  const xml = getFeedContent(feedType)
  return createHash('sha256').update(xml).digest('hex')
}

// @see: https://whitep4nth3r.com/blog/how-to-format-dates-for-rss-feeds-rfc-822/
export function addLeadingZero (num) {
  num = num.toString()
  while (num.length < 2) num = '0' + num
  return num
}

export function buildRFC822Date (dateString) {
  const dayStrings = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthStrings = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const timeStamp = Date.parse(dateString)
  const date = new Date(timeStamp)

  const day = dayStrings[date.getDay()]
  const dayNumber = addLeadingZero(date.getDate())
  const month = monthStrings[date.getMonth()]
  const year = date.getFullYear()
  const time = `${addLeadingZero(date.getHours())}:${addLeadingZero(date.getMinutes())}:00`
  const timezone = date.getTimezoneOffset() === 0 ? 'GMT' : 'BST'

  // Wed, 02 Oct 2002 13:00:00 GMT
  return `${day}, ${dayNumber} ${month} ${year} ${time} ${timezone}`
}

export function generateRetroRequestUrl (dateString) {
  return `https://raw.githubusercontent.com/cutenode/retro-weekly/main/retros/${dateString}.md`
}

export function generateRetroUIUrl (dateString) {
  return `https://github.com/cutenode/retro-weekly/blob/main/retros/${dateString}.md`
}

export function parseRetrospectiveContent (data) {
  const [rawTitle, , description] = data.split('\n')
  const title = rawTitle.replace('# ', '').replaceAll('`', '').trim()
  const dates = title.split(dateRegex)
  return { title, description, lastDay: dates[1], nextDay: dates[3] }
}

export function splitMainFeed () {
  const mainFeed = getFeedContent()
  const { breakDelimiter } = getConfig()
  
  // Extract header and items
  const [header, content] = mainFeed.split(breakDelimiter)
  const [itemsSection] = content.split('</channel>')
  const items = itemsSection.split('<item>').filter(item => item.trim())
  
  // Categorize items
  const feeds = { releases: [], issues: [], discussions: [], retrospectives: [] }
  
  items.forEach(item => {
    const fullItem = '<item>' + item
    if (fullItem.includes('Released ')) {
      feeds.releases.push(fullItem)
    } else if (fullItem.includes('update on') && fullItem.includes('#issuecomment-')) {
      feeds.issues.push(fullItem)
    } else if (fullItem.includes('update on') && fullItem.includes('#discussioncomment-')) {
      feeds.discussions.push(fullItem)
    } else if (fullItem.includes('retrospective')) {
      feeds.retrospectives.push(fullItem)
    }
  })
  
  // Generate separate feed files
  Object.entries(feeds).forEach(([type, items]) => {
    const feedTitle = type.charAt(0).toUpperCase() + type.slice(1)
    const feedHeader = header
      .replace('<title>Node.js News</title>', `<title>Node.js ${feedTitle}</title>`)
      .replace('feed.xml', `${type}.xml`)
    
    const feedContent = `${feedHeader}${breakDelimiter}${items.join('')}  </channel>\n</rss>`
    writeFileSync(join(process.cwd(), `${type}.xml`), feedContent)
  })
  
  return feeds
}
