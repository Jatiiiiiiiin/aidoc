#!/usr/bin/env node
import { Command } from "commander";
import { init } from "./commands/init.js";

const program = new Command();

program
  .name("aidoc")
  .description("Auto-generate investor-grade technical docs from any GitHub repo")
  .version("1.0.0");

program
  .command("init")
  .description("Set up AI documentation pipeline in the current repository")
  .option("--webhook-url <url>", "n8n webhook URL (can also be set via AIDOC_WEBHOOK_URL env var)")
  .option("--skip-install", "Skip npm install after scaffolding")
  .action(init);

program.parse();
