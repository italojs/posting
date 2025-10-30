# Node.js News Feeder

A comprehensive Node.js ecosystem news aggregator that collects updates from multiple GitHub repositories and generates RSS feeds.

## 🚀 Features

- **📦 Releases**: Latest Node.js releases and version updates
- **📋 Issues**: Critical issues and team updates from working groups
- **� Discussions**: Community discussions and RFC updates  
- **🔄 Pull Requests**: Latest PRs from core repositories
- **📊 Retrospectives**: Meeting notes and retrospectives from working groups
- **🔑 GitHub Authentication**: Enhanced API access with rate limiting

## �📁 Structure

```
news-feeder/
├── config.json       # Configuration for feeds and sources
├── utils.js          # Core utilities for feed generation  
├── collector.js      # Data collection from GitHub API
└── ../scripts/update-nodejs-feeds.js  # CLI script

public/
├── releases.xml      # Node.js releases feed
├── issues.xml        # Team updates feed
├── discussions.xml   # Community discussions feed
├── pullrequests.xml  # Pull requests feed
└── retrospectives.xml # Meeting notes feed
```

## 🎯 Quick Start

### Manual Update:
```bash
# With GitHub token for enhanced access
GITHUB_TOKEN=your_token_here node scripts/update-nodejs-feeds.js

# Without token (limited rate)
node scripts/update-nodejs-feeds.js
```

### Access Feeds:
- **Releases**: `http://localhost:3000/releases.xml`
- **Issues**: `http://localhost:3000/issues.xml`
- **Discussions**: `http://localhost:3000/discussions.xml`
- **Pull Requests**: `http://localhost:3000/pullrequests.xml`
- **Retrospectives**: `http://localhost:3000/retrospectives.xml`

## ⚙️ Configuration

Edit `news-feeder/config.json` to customize repositories and teams:

```json
{
  "lastCheckTimestamp": 1729785600000,
  "feeds": ["releases", "issues", "discussions", "retrospectives", "pullrequests"],
  "issuesInScope": [
    {
      "team": "Website team",
      "issue": "nodejs/nodejs.org/issues/5602"
    },
    {
      "team": "Security WG", 
      "issue": "nodejs/security-wg/issues/1006"
    }
  ],
  "pullRequestsInScope": [
    {
      "team": "Node.js Core",
      "repo": "nodejs/node"
    },
    {
      "team": "Website Team",
      "repo": "nodejs/nodejs.org"
    },
    {
      "team": "Security WG",
      "repo": "nodejs/security-wg"
    }
  ],
  "retrospectivesInScope": [
    {
      "team": "TSC",
      "repo": "nodejs/TSC"
    },
    {
      "team": "Community Committee",
      "repo": "nodejs/community-committee"
    }
  ]
}
```

## � Authentication

For enhanced GitHub API access, set your token in `.env`:

```bash
GITHUB_TOKEN=github_pat_your_token_here
```

## �🔧 Integration

### Meteor Integration
The feeds are automatically generated on server startup and served from the `public/` directory.

### Manual Integration
```javascript
import { collectAll } from './news-feeder/collector.js'

// Collect all feeds
const result = await collectAll()
console.log(`Updated: ${result.releases} releases, ${result.pullRequests} PRs`)
```

## 📊 Monitored Repositories

**Core Repositories:**
- `nodejs/node` - Main Node.js repository
- `nodejs/nodejs.org` - Official website
- `nodejs/security-wg` - Security working group
- `nodejs/build` - Build tools and infrastructure
- `nodejs/docker-node` - Official Docker images

**Governance:**
- `nodejs/TSC` - Technical Steering Committee
- `nodejs/community-committee` - Community Committee  
- `nodejs/Release` - Release working group
- `nodejs/package-maintenance` - Package maintenance

## 🔍 Feed Content

### Releases Feed
- New Node.js version releases
- Release notes and changelogs
- Author and publication date

### Issues Feed  
- Critical issues from working groups
- Team updates and announcements
- Issue comments and status changes

### Pull Requests Feed
- Active PRs from core repositories
- PR descriptions and authors
- Update timestamps

### Retrospectives Feed
- Meeting notes from working groups
- Retrospectives and planning documents
- TSC and committee decisions



