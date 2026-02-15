#!/usr/bin/env node

/**
 * CLI entry point for agents-md
 */

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { detectProject } from './detect/index.js';
import { renderAgentsMd } from './render/index.js';
import { Profile } from './types.js';
import { Logger } from './utils/logger.js';
import { directoryExists, isPathSafe } from './utils/fs-utils.js';
import { getPackageVersion } from './utils/version.js';

const program = new Command();
const VALID_PROFILES: Profile[] = ['compact', 'standard', 'full'];

program
  .name('agents-md')
  .description('Generate AGENTS.md files for AI coding agents')
  .version(getPackageVersion());

program
  .command('init')
  .description('Generate AGENTS.md file')
  .argument('[path]', 'Project directory', process.cwd())
  .option('--out <path>', 'Output file path', './AGENTS.md')
  .option('--force', 'Overwrite existing file', false)
  .option('--dry-run', 'Preview without writing', false)
  .option('-y, --yes', 'Skip confirmations', false)
  .option('-i, --interactive', 'Interactive mode', false)
  .option('--profile <profile>', 'Output profile: compact|standard|full', 'compact')
  .option('--verbose', 'Verbose output', false)
  .action(async (projectPath: string, options) => {
    const logger = new Logger(options.verbose);

    try {
      const profile = String(options.profile || 'compact') as Profile;
      if (!VALID_PROFILES.includes(profile)) {
        logger.error(
          `Invalid profile "${profile}". Valid values: ${VALID_PROFILES.join(', ')}`
        );
        process.exit(1);
      }

      // Validate project path
      if (!directoryExists(projectPath)) {
        logger.error(`Directory not found: ${projectPath}`);
        process.exit(1);
      }

      // Resolve output path
      const outputPath = path.resolve(projectPath, options.out);

      // Validate output path is safe (prevent path traversal)
      if (!isPathSafe(projectPath, outputPath)) {
        logger.error('Output path must be within the project directory');
        process.exit(1);
      }

      // Check if output file exists
      if (fs.existsSync(outputPath) && !options.force && !options.dryRun) {
        logger.error(`${options.out} already exists. Use --force to overwrite.`);
        process.exit(1);
      }

      // Run detection
      logger.verbose('Reading package.json...');
      const detection = await detectProject(projectPath);

      logger.verbose(`Found: ${detection.packageInfo?.name} v${detection.packageInfo?.version || '?'}`);
      logger.verbose('Detecting framework...');
      logger.verbose(`Framework: ${detection.framework.type} (confidence: ${detection.framework.confidence})`);

      if (options.verbose && detection.framework.indicators.length > 0) {
        detection.framework.indicators.forEach(indicator => {
          logger.verbose(`  - ${indicator}`);
        });
      }

      logger.verbose('Extracting commands...');
      if (options.verbose) {
        logger.verbose(`  - install: ${detection.commands.install}`);
        if (detection.commands.dev) logger.verbose(`  - dev: ${detection.commands.dev}`);
        if (detection.commands.build) logger.verbose(`  - build: ${detection.commands.build}`);
        if (detection.commands.test) logger.verbose(`  - test: ${detection.commands.test}`);
        if (detection.commands.lint) logger.verbose(`  - lint: ${detection.commands.lint}`);
      }

      // Render AGENTS.md
      logger.verbose('Rendering template...');
      logger.verbose(`Profile: ${profile}`);
      const result = renderAgentsMd(detection, profile);

      logger.verbose('Validating output...');
      logger.verbose(`  - Lines: ${result.validation.lineCount}`);
      logger.verbose(`  - Tokens: ~${result.validation.estimatedTokens}`);

      // Show validation warnings
      if (result.validation.warnings.length > 0) {
        result.validation.warnings.forEach(warning => {
          logger.warning(warning);
        });
      }

      // Show validation errors (should stop generation)
      if (result.validation.errors.length > 0) {
        result.validation.errors.forEach(error => {
          logger.error(error);
        });
        logger.error('Generation failed due to validation errors');
        process.exit(1);
      }

      // Dry run or write
      if (options.dryRun) {
        logger.info('--- Preview (--dry-run mode) ---');
        console.log(result.content);
        logger.info('--- End of preview ---');
      } else {
        if (fs.existsSync(outputPath) && options.force) {
          logger.warning(`${options.out} already exists. Overwriting...`);
        }

        fs.writeFileSync(outputPath, result.content, 'utf-8');

        logger.success(`Generated ${options.out}`);

        if (!options.verbose) {
          logger.info(
            `Detected: ${detection.framework.type !== 'unknown' ? detection.framework.type : 'Node.js project'}`
          );
          logger.info(
            `${result.validation.lineCount} lines, ~${result.validation.estimatedTokens} tokens`
          );
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message);
      } else {
        logger.error('An unknown error occurred');
      }
      process.exit(1);
    }
  });

// Parse CLI arguments
program.parse();
