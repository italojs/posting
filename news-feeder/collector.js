import fetch from 'node-fetch'
import { getConfig, saveFeed, buildRFC822Date } from './utils.js'

// GitHub API headers with authentication
const getGitHubHeaders = () => {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Node.js News Feeder'
  }
  
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`
  }
  
  return headers
}

export async function collectReleases() {
  try {
    const response = await fetch('https://api.github.com/repos/nodejs/node/releases?per_page=10', {
      headers: getGitHubHeaders()
    })
    const releases = await response.json()
    
    const { lastCheckTimestamp } = getConfig()
    
    const items = releases
      .filter(rel => new Date(rel.published_at).getTime() > lastCheckTimestamp)
      .map(rel => ({
        title: `Released ${rel.tag_name}`,
        description: `<![CDATA[<p>Released ${rel.tag_name} by ${rel.author.login}. <a href="${rel.html_url}">More details</a></p>]]>`,
        pubDate: buildRFC822Date(rel.published_at),
        link: rel.html_url,
        guid: rel.html_url
      }))
    
    return saveFeed('releases', items)
  } catch (error) {
    console.error('Error collecting releases:', error.message)
    return 0
  }
}

export async function collectIssues() {
  try {
    const { issuesInScope, lastCheckTimestamp } = getConfig()
    const items = []
    
    for (const { issue, team } of issuesInScope) {
      const response = await fetch(`https://api.github.com/repos/${issue}/comments?per_page=10`, {
        headers: getGitHubHeaders()
      })
      const comments = await response.json()
      
      const newComments = comments
        .filter(comment => new Date(comment.updated_at).getTime() > lastCheckTimestamp)
        .map(comment => ({
          title: `${team} update`,
          description: `<![CDATA[${comment.body.substring(0, 500)}...]]>`,
          pubDate: buildRFC822Date(comment.created_at),
          link: comment.html_url,
          guid: comment.html_url
        }))
      
      items.push(...newComments)
    }
    
    return saveFeed('issues', items)
  } catch (error) {
    console.error('Error collecting issues:', error.message)
    return 0
  }
}

export async function collectDiscussions() {
  try {
    const { discussionsInScope, lastCheckTimestamp } = getConfig()
    const items = []
    
    for (const { discussionId, team } of discussionsInScope) {
      const response = await fetch(`https://api.github.com/repos/nodejs/node/discussions/${discussionId}/comments?per_page=10`, {
        headers: getGitHubHeaders()
      })
      
      if (!response.ok) {
        console.warn(`Failed to fetch discussion ${discussionId}: ${response.status}`)
        continue
      }
      
      const comments = await response.json()
      
      // Verifica se comments é um array
      if (!Array.isArray(comments)) {
        console.warn(`Discussion ${discussionId} returned non-array response`)
        continue
      }
      
      const newComments = comments
        .filter(comment => new Date(comment.updated_at).getTime() > lastCheckTimestamp)
        .map(comment => ({
          title: `${team} discussion update`,
          description: `<![CDATA[${comment.body.substring(0, 500)}...]]>`,
          pubDate: buildRFC822Date(comment.created_at),
          link: comment.html_url,
          guid: comment.html_url
        }))
      
      items.push(...newComments)
    }
    
    return saveFeed('discussions', items)
  } catch (error) {
    console.error('Error collecting discussions:', error.message)
    return 0
  }
}

export async function collectPullRequests() {
  try {
    const { pullRequestsInScope, lastCheckTimestamp } = getConfig()
    const items = []
    
    for (const { repo, team } of pullRequestsInScope) {
      const response = await fetch(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=10&sort=updated`, {
        headers: getGitHubHeaders()
      })
      const prs = await response.json()
      
      const newPRs = prs
        .filter(pr => new Date(pr.updated_at).getTime() > lastCheckTimestamp)
        .map(pr => ({
          title: `${team}: ${pr.title}`,
          description: `<![CDATA[<p>PR #${pr.number} by ${pr.user.login}. ${pr.body ? pr.body.substring(0, 300) + '...' : 'No description'} <a href="${pr.html_url}">View PR</a></p>]]>`,
          pubDate: buildRFC822Date(pr.updated_at),
          link: pr.html_url,
          guid: pr.html_url
        }))
      
      items.push(...newPRs)
    }
    
    return saveFeed('pullrequests', items)
  } catch (error) {
    console.error('Error collecting pull requests:', error.message)
    return 0
  }
}

export async function collectRetrospectives() {
  try {
    const { retrospectivesInScope, lastCheckTimestamp } = getConfig()
    const items = []
    
    for (const { repo, team } of retrospectivesInScope) {
      // Procura por issues com label "retrospective" ou "meeting-notes"
      const response = await fetch(`https://api.github.com/repos/${repo}/issues?labels=retrospective,meeting-notes&per_page=10&sort=updated`, {
        headers: getGitHubHeaders()
      })
      const retrospectives = await response.json()
      
      const newRetrospectives = retrospectives
        .filter(retro => new Date(retro.updated_at).getTime() > lastCheckTimestamp)
        .map(retro => ({
          title: `${team}: ${retro.title}`,
          description: `<![CDATA[<p>${retro.body ? retro.body.substring(0, 400) + '...' : 'No content'} <a href="${retro.html_url}">Read more</a></p>]]>`,
          pubDate: buildRFC822Date(retro.updated_at),
          link: retro.html_url,
          guid: retro.html_url
        }))
      
      items.push(...newRetrospectives)
    }
    
    return saveFeed('retrospectives', items)
  } catch (error) {
    console.error('Error collecting retrospectives:', error.message)
    return 0
  }
}

export async function collectAll() {
  console.log('🔄 Collecting Node.js feeds...')
  
  const releases = await collectReleases()
  const issues = await collectIssues()
  const discussions = await collectDiscussions()
  const pullRequests = await collectPullRequests()
  const retrospectives = await collectRetrospectives()
  
  console.log(`✅ Feeds updated:`)
  console.log(`   📦 Releases: ${releases} items`)
  console.log(`   📋 Issues: ${issues} items`) 
  console.log(`   💬 Discussions: ${discussions} items`)
  console.log(`   🔄 Pull Requests: ${pullRequests} items`)
  console.log(`   📊 Retrospectives: ${retrospectives} items`)
  
  return { releases, issues, discussions, pullRequests, retrospectives }
}