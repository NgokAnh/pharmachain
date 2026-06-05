const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://neondb_owner:npg_COBhS6re8Ikt@ep-young-fire-aq3ep9a6-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require'
        }
    }
});

async function main() {
    try {
        await prisma.$queryRawUnsafe('SELECT 1');
        console.log('? Success with sslmode=require');
    } catch (e) {
        console.error('? Failed with sslmode=require', e.message);
    }

    const prisma2 = new PrismaClient({
        datasources: {
            db: {
                url: 'postgresql://neondb_owner:npg_COBhS6re8Ikt@ep-young-fire-aq3ep9a6-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true'
            }
        }
    });

    try {
        await prisma2.$queryRawUnsafe('SELECT 1');
        console.log('? Success with pgbouncer=true');
    } catch (e) {
        console.error('? Failed with pgbouncer=true', e.message);
    }
}
main().finally(() => process.exit(0));
