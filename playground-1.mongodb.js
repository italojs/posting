// Seleciona o DB "meteor" explicitamente
db = db.getSiblingDB('meteor');

// 1) Índice único por URL (evita duplicados)
db.rss_sources.createIndex({ url: 1 }, { unique: true });

// 2) Upsert em massa (pode rodar várias vezes sem duplicar)
const now = new Date();
db.rss_sources.bulkWrite([
  // Technology
  {
    updateOne: {
      filter: { url: "https://www.theverge.com/rss/index.xml" },
      update: { $set: { name: "The Verge", category: "technology", enabled: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
      upsert: true
    }
  },
  {
    updateOne: {
      filter: { url: "https://www.engadget.com/rss.xml" },
      update: { $set: { name: "Engadget", category: "technology", enabled: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
      upsert: true
    }
  },
  {
    updateOne: {
      filter: { url: "https://news.ycombinator.com/rss" },
      update: { $set: { name: "Hacker News", category: "technology", enabled: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
      upsert: true
    }
  },

  // Business
  {
    updateOne: {
      filter: { url: "https://feeds.bloomberg.com/technology/news.rss" },
      update: { $set: { name: "Bloomberg Technology", category: "business", enabled: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
      upsert: true
    }
  },
  {
    updateOne: {
      filter: { url: "https://www.ft.com/?format=rss" },
      update: { $set: { name: "Financial Times", category: "business", enabled: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
      upsert: true
    }
  },

  // Science
  {
    updateOne: {
      filter: { url: "https://www.nature.com/subjects/science/rss" },
      update: { $set: { name: "Nature", category: "science", enabled: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
      upsert: true
    }
  },
  {
    updateOne: {
      filter: { url: "https://www.nasa.gov/news-release/feed/" },
      update: { $set: { name: "NASA", category: "science", enabled: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
      upsert: true
    }
  },

  // Sports
  {
    updateOne: {
      filter: { url: "https://www.espn.com/espn/rss/news" },
      update: { $set: { name: "ESPN", category: "sports", enabled: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
      upsert: true
    }
  },
  {
    updateOne: {
      filter: { url: "https://www.theguardian.com/uk/sport/rss" },
      update: { $set: { name: "The Guardian Sport", category: "sports", enabled: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
      upsert: true
    }
  },

  // Entertainment
  {
    updateOne: {
      filter: { url: "https://www.rollingstone.com/music/music-news/feed/" },
      update: { $set: { name: "Rolling Stone", category: "entertainment", enabled: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
      upsert: true
    }
  },
  {
    updateOne: {
      filter: { url: "https://variety.com/feed/" },
      update: { $set: { name: "Variety", category: "entertainment", enabled: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
      upsert: true
    }
  },

  // General
  {
    updateOne: {
      filter: { url: "http://feeds.bbci.co.uk/news/rss.xml" },
      update: { $set: { name: "BBC News", category: "general", enabled: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
      upsert: true
    }
  },
  {
    updateOne: {
      filter: { url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml" },
      update: { $set: { name: "NYTimes", category: "general", enabled: true, updatedAt: now }, $setOnInsert: { createdAt: now } },
      upsert: true
    }
  }
]);

// Validação rápida
db.getName(); // deve mostrar "meteor"
db.rss_sources.countDocuments();
db.rss_sources.find().limit(3).pretty();