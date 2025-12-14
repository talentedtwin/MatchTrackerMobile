#!/usr/bin/env node
/**
 * Email Service Test Script
 *
 * This script tests the email service by sending test emails.
 *
 * Usage:
 *   node test-email-service.js [email] [test-type]
 *   node test-email-service.js user@example.com 1
 *   node test-email-service.js user@example.com all
 *
 * Test types:
 *   1 - Simple test email
 *   2 - Match reminder email
 *   3 - Welcome email
 *   4 or all - All tests
 *
 * Required environment variables:
 * - MAILGUN_API_KEY
 * - MAILGUN_DOMAIN
 * - MAILGUN_FROM_EMAIL (optional)
 */

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import readline from "readline";
import {
  sendEmail,
  sendMatchReminderEmail,
  sendWelcomeEmail,
} from "./lib/emailService.js";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, ".env.local") });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function checkConfiguration() {
  console.log("\n🔍 Checking Email Configuration...\n");

  const checks = {
    MAILGUN_API_KEY: !!process.env.MAILGUN_API_KEY,
    MAILGUN_DOMAIN: !!process.env.MAILGUN_DOMAIN,
    MAILGUN_FROM_EMAIL: !!process.env.MAILGUN_FROM_EMAIL,
  };

  let allGood = true;
  for (const [key, value] of Object.entries(checks)) {
    const status = value ? "✅" : "❌";
    const displayValue = value
      ? key === "MAILGUN_API_KEY"
        ? "••••••••"
        : process.env[key]
      : "NOT SET";
    console.log(`${status} ${key}: ${displayValue}`);
    if (!value && key !== "MAILGUN_FROM_EMAIL") {
      allGood = false;
    }
  }

  console.log("");

  if (!allGood) {
    console.error("❌ Missing required environment variables!");
    console.log("\nPlease set the following in your .env.local file:");
    console.log("- MAILGUN_API_KEY=your-api-key");
    console.log("- MAILGUN_DOMAIN=your-domain.mailgun.org");
    console.log("- MAILGUN_FROM_EMAIL=noreply@yourdomain.com (optional)\n");
    return false;
  }

  return true;
}

async function testSimpleEmail(toEmail) {
  console.log("\n📧 Testing Simple Email...\n");

  const emailData = {
    to: toEmail,
    subject: "MatchTracker Email Service Test",
    text: "This is a test email from the MatchTracker email service. If you receive this, your email configuration is working correctly!",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Test Email</title>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #2563eb; margin-bottom: 20px;">✅ Email Service Test</h1>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            This is a test email from the <strong>MatchTracker</strong> email service.
          </p>
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            If you receive this email, your email configuration is working correctly! 🎉
          </p>
          <div style="margin-top: 30px; padding: 15px; background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #166534;">
              <strong>Test Details:</strong><br>
              Sent at: ${new Date().toLocaleString()}<br>
              From: ${
                process.env.MAILGUN_FROM_EMAIL ||
                `noreply@${process.env.MAILGUN_DOMAIN}`
              }
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const result = await sendEmail(emailData);
    if (result) {
      console.log("✅ Simple email sent successfully!");
      console.log(`   Message ID: ${result.id}`);
      console.log(`   Status: ${result.status || "Queued"}`);
      return true;
    } else {
      console.error("❌ Failed to send simple email - no response received");
      return false;
    }
  } catch (error) {
    console.error("❌ Error sending simple email:", error.message);
    if (error.details) {
      console.error("   Details:", error.details);
    }
    return false;
  }
}

async function testMatchReminderEmail(toEmail) {
  console.log("\n⚽ Testing Match Reminder Email...\n");

  const testMatch = {
    id: "test-match-" + Date.now(),
    opponent: "Test FC",
    venue: "home",
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    type: "league",
  };

  try {
    const result = await sendMatchReminderEmail(
      toEmail,
      "Test User",
      testMatch
    );
    if (result) {
      console.log("✅ Match reminder email sent successfully!");
      console.log(`   Message ID: ${result.id}`);
      console.log(`   Match: ${testMatch.opponent}`);
      return true;
    } else {
      console.error(
        "❌ Failed to send match reminder email - no response received"
      );
      return false;
    }
  } catch (error) {
    console.error("❌ Error sending match reminder email:", error.message);
    if (error.details) {
      console.error("   Details:", error.details);
    }
    return false;
  }
}

async function testWelcomeEmail(toEmail) {
  console.log("\n👋 Testing Welcome Email...\n");

  try {
    const result = await sendWelcomeEmail(toEmail, "Test User");
    if (result) {
      console.log("✅ Welcome email sent successfully!");
      console.log(`   Message ID: ${result.id}`);
      return true;
    } else {
      console.error("❌ Failed to send welcome email - no response received");
      return false;
    }
  } catch (error) {
    console.error("❌ Error sending welcome email:", error.message);
    if (error.details) {
      console.error("   Details:", error.details);
    }
    return false;
  }
}

async function runTests() {
  console.log("╔════════════════════════════════════════════╗");
  console.log("║   MatchTracker Email Service Test Tool    ║");
  console.log("╚════════════════════════════════════════════╝");

  // Check configuration
  const configOk = await checkConfiguration();
  if (!configOk) {
    process.exit(1);
  }

  // Get recipient email from command line args or prompt
  const args = process.argv.slice(2);
  let email = args[0];
  let choice = args[1];

  // If email not provided via CLI, prompt for it
  if (!email) {
    email = await question("Enter recipient email address: ");
  }

  if (!email || !email.includes("@")) {
    console.error("\n❌ Invalid email address!");
    rl.close();
    process.exit(1);
  }

  console.log(`\n📬 Will send test emails to: ${email}`);

  // If choice not provided via CLI, prompt for it
  if (!choice) {
    console.log("\nSelect tests to run:");
    console.log("1. Simple Test Email");
    console.log("2. Match Reminder Email");
    console.log("3. Welcome Email");
    console.log("4. All Tests\n");

    choice = await question("Enter your choice (1-4): ");
  }

  const results = {
    simple: null,
    matchReminder: null,
    welcome: null,
  };

  console.log("\n" + "=".repeat(50));

  // Normalize choice (handle 'all' as well as '4')
  if (choice.toLowerCase() === "all") {
    choice = "4";
  }

  switch (choice) {
    case "1":
      results.simple = await testSimpleEmail(email);
      break;
    case "2":
      results.matchReminder = await testMatchReminderEmail(email);
      break;
    case "3":
      results.welcome = await testWelcomeEmail(email);
      break;
    case "4":
      results.simple = await testSimpleEmail(email);
      results.matchReminder = await testMatchReminderEmail(email);
      results.welcome = await testWelcomeEmail(email);
      break;
    default:
      console.error("\n❌ Invalid choice!");
      rl.close();
      process.exit(1);
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("\n📊 Test Summary:\n");

  const testResults = [
    { name: "Simple Email", result: results.simple },
    { name: "Match Reminder", result: results.matchReminder },
    { name: "Welcome Email", result: results.welcome },
  ];

  let passCount = 0;
  let failCount = 0;

  testResults.forEach(({ name, result }) => {
    if (result === null) return;
    const status = result ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} - ${name}`);
    if (result) passCount++;
    else failCount++;
  });

  console.log("\n" + "=".repeat(50));
  console.log(`\nTotal: ${passCount} passed, ${failCount} failed`);

  if (failCount === 0 && passCount > 0) {
    console.log("\n🎉 All tests passed! Email service is working correctly.\n");
  } else if (failCount > 0) {
    console.log(
      "\n⚠️  Some tests failed. Check the errors above for details.\n"
    );
    console.log("Common issues:");
    console.log("- Invalid Mailgun API key or domain");
    console.log("- Domain not verified in Mailgun");
    console.log(
      "- Recipient email in sandbox mode (only authorized recipients allowed)"
    );
    console.log("- Network connectivity issues\n");
  }

  rl.close();
}

// Run the tests
runTests().catch((error) => {
  console.error("\n❌ Unexpected error:", error);
  rl.close();
  process.exit(1);
});
