// Option 1: For standalone Node.js script (needs dotenv)
// Uncomment if you want to use dotenv:
// require('dotenv').config();

// Option 2: Manual configuration (no dotenv needed)
// Just set your values directly here for testing:
const CONFIG = {
  URI: "neo4j+s://b58ccce8.databases.neo4j.io",
  USER: "neo4j", 
  PASSWORD: "k26hehgL3dk7N0lzfqBIcwBC6RIkupYFVZCRQZN26KQ" // PUT YOUR ACTUAL PASSWORD HERE
};

var neo4j = require('neo4j-driver');

(async () => {
  // Use manual config or environment variables
  const URI = CONFIG.URI || process.env.NEO4J_URI || 'bolt://localhost:7687'
  const USER = CONFIG.USER || process.env.NEO4J_USER || 'neo4j'  
  const PASSWORD = (CONFIG.PASSWORD || process.env.NEO4J_PASSWORD || 'password').trim()
  
  console.log('Testing Neo4j connection...');
  console.log(`URI: ${URI}`);
  console.log(`User: ${USER}`);
  console.log(`Password: ${PASSWORD ? '[SET - Length: ' + PASSWORD.length + ']' : '[EMPTY/NOT SET]'}`);
  console.log('---');
  
  // Check for common issues before connecting
  if (!PASSWORD || PASSWORD === 'password') {
    console.log('⚠️  WARNING: Password is empty or using default. Neo4j Aura requires a valid password!');
    console.log('   Please set your password in the CONFIG object above or NEO4J_PASSWORD env var');
    console.log('   You can find your password in Neo4j Aura Console > Connect tab');
    return;
  }
  
  if (!URI.startsWith('neo4j+s://') && !URI.startsWith('bolt://')) {
    console.log('⚠️  WARNING: URI format may be invalid. Expected neo4j+s:// for Aura or bolt:// for local');
    return;
  }
  
  let driver
  try {
    driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD))
    const serverInfo = await driver.getServerInfo()
    console.log('✅ Connection established successfully!')
    console.log('Server Info:')
    console.log(`  Address: ${serverInfo.address}`)
    console.log(`  Agent: ${serverInfo.agent}`)
    console.log(`  Protocol Version: ${serverInfo.protocolVersion}`)
    
    // Test a simple query
    console.log('\n🔍 Testing simple query...')
    const session = driver.session()
    try {
      const result = await session.run('RETURN "Hello Neo4j!" as message, datetime() as timestamp')
      const record = result.records[0]
      console.log('✅ Query successful!')
      console.log(`  Message: ${record.get('message')}`)
      console.log(`  Timestamp: ${record.get('timestamp')}`)
    } catch (queryErr) {
      console.log('❌ Query failed:')
      console.log(`  Error: ${queryErr.message}`)
    } finally {
      await session.close()
    }
    
    // Check for Article nodes (optional)
    console.log('\n📊 Checking for Article nodes...')
    const checkSession = driver.session()
    try {
      const result = await checkSession.run('MATCH (n:Article) RETURN count(n) as articleCount')
      const count = result.records[0]?.get('articleCount')?.toNumber() || 0
      console.log(`📈 Found ${count} Article nodes in database`)
      
      if (count > 0) {
        // Show sample sessionIds
        const sessionResult = await checkSession.run(
          'MATCH (n:Article) RETURN DISTINCT n.sessionId as sessionId LIMIT 5'
        )
        console.log('📋 Available sessionIds:')
        sessionResult.records.forEach((record, index) => {
          console.log(`  ${index + 1}. ${record.get('sessionId')}`)
        })
      } else {
        console.log('💡 No Article nodes found. Make sure to populate your database first.')
      }
    } catch (checkErr) {
      console.log('⚠️  Could not check Article nodes (this is optional):')
      console.log(`  Error: ${checkErr.message}`)
    } finally {
      await checkSession.close()
    }
    
  } catch(err) {
    console.log('❌ Connection failed!')
    console.log(`Error: ${err.message}`)
    if (err.cause) {
      console.log(`Cause: ${err.cause}`)
    }
    
    // Provide troubleshooting tips
    console.log('\n🔧 Troubleshooting tips:')
    if (err.code === 'ECONNREFUSED') {
      console.log('  • Neo4j server is not running or not accessible')
      console.log('  • Check if Neo4j is started: sudo systemctl status neo4j')
      console.log('  • For Docker: docker ps | grep neo4j')
    } else if (err.message.includes('authentication')) {
      console.log('  • Invalid username or password')
      console.log('  • Default credentials: neo4j/neo4j (change on first login)')
    } else if (err.message.includes('WebSocket') || err.message.includes('SSL')) {
      console.log('  • SSL/TLS connection issues')
      console.log('  • For local: use bolt://localhost:7687')
      console.log('  • For Aura: use neo4j+s://xxx.databases.neo4j.io')
    } else if (err.message.includes('DNS') || err.message.includes('resolve')) {
      console.log('  • DNS resolution failed')
      console.log('  • Check your internet connection and URI')
    }
    console.log('  • Verify firewall settings (Neo4j uses ports 7687, 7474)')
    console.log('  • Try Neo4j Browser first: http://localhost:7474')
    
  } finally {
    if (driver) {
      await driver.close()
      console.log('\n🔌 Driver closed')
    }
  }
})();