
require('dotenv').config();

const url = process.env.DATABASE_URL;
if (!url) {
    console.log("No DATABASE_URL set in environment.");
} else {
    // Mask password
    const masked = url.replace(/:[^:@]+@/, ":****@");
    console.log("Local DATABASE_URL:", masked);
    // Check if it matches the fallback domain
    if (url.includes("lira-db.cluster-ctkse40gyfit")) {
        console.log("Matches AWS RDS domain.");
    } else {
        console.log("Does NOT match AWS RDS fallback domain.");
    }
}
