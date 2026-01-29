
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env');
try {
    const data = fs.readFileSync(envPath, 'utf8');
    const match = data.match(/DATABASE_URL=(.*)/);
    if (match) {
        const url = match[1].trim();
        const masked = url.replace(/:[^:@]+@/, ":****@");
        console.log("Local DATABASE_URL:", masked);
        if (url.includes("lira-db.cluster-ctkse40gyfit")) {
             console.log("Matches AWS RDS domain.");
        } else {
             console.log("Does NOT match AWS RDS fallback domain.");
        }
        
        // Also check if fallback password is correct (without revealing it completely)
        // Fallback password was: asdasd11
        const fallbackPw = "asdasd11";
        if (url.includes(":" + fallbackPw + "@")) {
             console.log("Password matches fallback password.");
        } else {
             console.log("Password DOES NOT match fallback password.");
        }
    } else {
        console.log("DATABASE_URL not found in .env");
    }
} catch (e) {
    console.log("Could not read .env file:", e.message);
}
