#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const init_js_1 = require("./commands/init.js");
const program = new commander_1.Command();
program
    .name("aidoc")
    .description("Auto-generate investor-grade technical docs from any GitHub repo")
    .version("1.0.0");
program
    .command("init")
    .description("Set up AI documentation pipeline in the current repository")
    .option("--webhook-url <url>", "n8n webhook URL (can also be set via AIDOC_WEBHOOK_URL env var)")
    .option("--skip-install", "Skip npm install after scaffolding")
    .action(init_js_1.init);
program.parse();
