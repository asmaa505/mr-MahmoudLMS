import {
  purgeSeedData,
  replaceAdminDefaultCredentials,
  verifyProductionReadiness,
} from "../src/lib/production-security";
import { db } from "../src/lib/db";

async function main() {
  console.log("===============================================================================");
  console.log(" 🔒 PRODUCTION SECURITY PREPARATION: CREDENTIAL ROTATION & SEED PURGE");
  console.log("===============================================================================");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Environment: ${process.env.NODE_ENV || "production"}\n`);

  // Step 1: Purge Development Seed Data
  console.log("--- [STEP 1/3] Purging Development Seed Data ---");
  const purgeResult = await purgeSeedData({ dryRun: false });
  console.log(`✓ Purged Seed Users: ${purgeResult.purgedUsers.length}`);
  for (const u of purgeResult.purgedUsers) {
    console.log(`   - Removed: ${u.name} (${u.phone}, ${u.role}) [${u.reason}]`);
  }
  console.log(`✓ Purged Seed Activation Codes: ${purgeResult.purgedActivationCodes.length}`);
  if (purgeResult.purgedActivationCodes.length > 0) {
    console.log(`   - Removed codes: ${purgeResult.purgedActivationCodes.join(", ")}`);
  }
  console.log(`✓ Cleaned cascading records:`);
  console.log(`   - Sessions: ${purgeResult.deletedSessionsCount}`);
  console.log(`   - Quiz Attempts: ${purgeResult.deletedQuizAttemptsCount}`);
  console.log(`   - Lesson Progress: ${purgeResult.deletedLessonProgressCount}`);
  console.log(`   - Enrollments: ${purgeResult.deletedEnrollmentsCount}`);
  console.log(`   - Weekly Reports: ${purgeResult.deletedWeeklyReportsCount}\n`);

  // Step 2: Replace Administrative Default Credentials
  console.log("--- [STEP 2/3] Replacing Administrative Default Credentials ---");
  // Check if an explicit strong password was provided in environment variable
  const envAdminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_INITIAL_PASSWORD;

  const rotationResults = await replaceAdminDefaultCredentials({
    newPassword: envAdminPassword,
    forceRotate: true, // Replace all default and ensure strong randomized passwords
    length: 24,
  });

  console.log(`✓ Successfully rotated administrative credentials for ${rotationResults.length} admin account(s):`);
  for (const res of rotationResults) {
    console.log("\n---------------------------------------------------------------");
    console.log(`  👤 Administrator: ${res.name} (Phone: ${res.phone})`);
    console.log(`  ⚠️  Previous Default Insecure Password Replaced: ${res.previousWasDefault ? `YES ("${res.matchedDefaultPassword}")` : "Forced Security Rotation"}`);
    console.log(`  🔑 NEW SECURE PASSWORD: ${res.newPasswordPlaintext}`);
    console.log(`  🛡️  Active Stale Sessions Revoked: ${res.sessionsRevokedCount}`);
    console.log("---------------------------------------------------------------");
  }
  console.log("\n⚠️ IMPORTANT: Copy and securely store the administrator password above!");
  console.log("It will NOT be shown again and cannot be recovered in plaintext.\n");

  // Step 3: Verify Production Readiness
  console.log("--- [STEP 3/3] Verifying Production Readiness ---");
  const readiness = await verifyProductionReadiness();

  if (readiness.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const w of readiness.warnings) {
      console.log(` ⚠️  ${w}`);
    }
  }

  if (!readiness.isReady) {
    console.error("\n❌ PRODUCTION READINESS CHECK FAILED:");
    for (const v of readiness.violations) {
      console.error(` ⛔ ${v}`);
    }
    process.exit(1);
  }

  console.log("\n===============================================================================");
  console.log(" ✅ ALL ACCEPTANCE CRITERIA MET - PRODUCTION DEPLOYMENT SECURED");
  console.log("    1. Development seed data completely purged from database.");
  console.log("    2. Administrative default credentials replaced with strong random passwords.");
  console.log("    3. Default weak logins are now blocked completely.");
  console.log("===============================================================================\n");
}

main()
  .catch((err) => {
    console.error("FATAL ERROR during production security initialization:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
