/**
 * MongoDB migration script
 * Copies all collections from source cluster to target cluster.
 * Run: node migrate.mjs
 */

import { MongoClient } from 'mongodb';

const SOURCE_URI = 'mongodb+srv://govind_db_user:XKNmRf8rd7GbAa7p@cluster0.ya8tk4j.mongodb.net/?appName=Cluster0';
const TARGET_URI = 'mongodb+srv://thefinudb:anna%40thefinu123@cluster0.y0u2akb.mongodb.net/?appName=Cluster0';

// System databases to skip
const SKIP_DBS = new Set(['admin', 'config', 'local']);

async function migrate() {
    console.log('Connecting to source cluster...');
    const source = new MongoClient(SOURCE_URI);
    const target = new MongoClient(TARGET_URI);

    try {
        await source.connect();
        console.log('✅ Connected to source');

        await target.connect();
        console.log('✅ Connected to target');

        // List all databases on the source
        const { databases } = await source.db().admin().listDatabases();
        const userDbs = databases.filter(db => !SKIP_DBS.has(db.name));

        if (userDbs.length === 0) {
            console.log('⚠️  No user databases found on source cluster.');
            return;
        }

        console.log(`\nFound ${userDbs.length} database(s): ${userDbs.map(d => d.name).join(', ')}\n`);

        let totalDocs = 0;

        for (const { name: dbName } of userDbs) {
            const srcDb = source.db(dbName);
            const tgtDb = target.db(dbName);

            const collections = await srcDb.listCollections().toArray();
            console.log(`📂 Database: ${dbName}  (${collections.length} collection(s))`);

            for (const { name: colName } of collections) {
                const srcCol = srcDb.collection(colName);
                const tgtCol = tgtDb.collection(colName);

                const docs = await srcCol.find({}).toArray();

                if (docs.length === 0) {
                    console.log(`   ⬜ ${colName}: empty — skipped`);
                    continue;
                }

                // Drop existing target collection to avoid duplicates
                await tgtCol.drop().catch(() => {}); // ignore if doesn't exist
                await tgtCol.insertMany(docs, { ordered: false });

                console.log(`   ✅ ${colName}: ${docs.length} document(s) copied`);
                totalDocs += docs.length;
            }

            console.log('');
        }

        console.log(`\n🎉 Migration complete — ${totalDocs} total document(s) copied.`);

    } catch (err) {
        console.error('\n❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await source.close();
        await target.close();
    }
}

migrate();
