import { purgeSeedData } from "../src/lib/production-security";
import { db } from "../src/lib/db";

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(`Starting seed data purge${isDryRun ? " (DRY RUN - no changes will be written)" : ""}...`);

  const result = await purgeSeedData({ dryRun: isDryRun });

  console.log(`\nIdentified ${result.purgedUsers.length} seed/test users:`);
  for (const u of result.purgedUsers) {
    console.log(` - [${u.role}] ${u.name} (${u.phone}): ${u.reason}`);
  }

  console.log(`\nIdentified ${result.purgedActivationCodes.length} seed activation codes:`);
  for (const code of result.purgedActivationCodes) {
    console.log(` - ${code}`);
  }

  if (!isDryRun) {
    console.log(`\nSuccessfully purged:`);
    console.log(` - ${result.purgedUsers.length} users`);
    console.log(` - ${result.purgedActivationCodes.length} activation codes`);
    console.log(` - ${result.deletedSessionsCount} sessions`);
    console.log(` - ${result.deletedQuizAttemptsCount} quiz attempts`);
    console.log(` - ${result.deletedLessonProgressCount} lesson progress records`);
    console.log(` - ${result.deletedEnrollmentsCount} enrollments`);
    console.log(` - ${result.deletedWeeklyReportsCount} weekly reports`);
  } else {
    console.log(`\nDry run completed. Run without --dry-run to apply changes.`);
  }
}

main()
  .catch((err) => {
    console.error("Purge error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
