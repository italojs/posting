#!/bin/bash
# Node.js News Feeder Auto-Update Script
# Execute este script para atualizar os feeds RSS automaticamente

echo "🔄 Updating Node.js feeds..."
npm run update-feeds

echo "�� Last update: $(date)"
echo "✅ Feeds available at:"
echo "   📦 http://localhost:3000/releases.xml"
echo "   📋 http://localhost:3000/issues.xml" 
echo "   💬 http://localhost:3000/discussions.xml"
echo "   📊 http://localhost:3000/retrospectives.xml"
