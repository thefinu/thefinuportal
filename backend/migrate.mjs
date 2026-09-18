/**
 * MongoDB migration script
 * Copies all collections from source cluster to target cluster.
 * Run: node migrate.mjs
 */

import { MongoClient } from 'mongodb';

const SOURCE_URI = process.env.SOURCE_MONGODB_URI || '';
const TARGET_URI = process.env.TARGET_MONGODB_URI || '';

if (!SOURCE_URI || !TARGET_URI) {
    console.error('SOURCE_MONGODB_URI and TARGET_MONGODB_URI must be set.');
    console.error('They used to be hard-coded here, which put live database passwords into git.');
    console.error('Run: SOURCE_MONGODB_URI="..." TARGET_MONGODB_URI="..." node migrate.mjs');
    process.exit(1);
}

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
