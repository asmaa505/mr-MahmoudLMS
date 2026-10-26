import { replaceAdminDefaultCredentials } from "../src/lib/production-security";
import { db } from "../src/lib/db";

async function main() {
  const phoneArg = process.argv.find((arg) => arg.startsWith("--phone="))?.split("=")[1];
  const passwordArg = process.argv.find((arg) => arg.startsWith("--password="))?.split("=")[1];

  console.log("Rotating administrative credentials...");

  const results = await replaceAdminDefaultCredentials({
    adminPhone: phoneArg,
    newPassword: passwordArg,
    forceRotate: true,
  });

  for (const r of results) {
    console.log(`\nAdministrator: ${r.name} (${r.phone})`);
    console.log(`New Password: ${r.newPasswordPlaintext}`);
    console.log(`Revoked Sessions: ${r.sessionsRevokedCount}`);
  }
}

main()
  .catch((err) => {
    console.error("Rotation error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
