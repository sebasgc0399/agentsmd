/**
 * Core type definitions for agents-md CLI
 */

export interface CLIOptions {
  out: string;
  force: boolean;
  dryRun: boolean;
  yes: boolean;
  interactive: boolean;
  template?: string;
  verbose: boolean;
  profile: Profile;
}

export type WorkspaceConfig = string[] | { packages?: string[] };

export interface PackageInfo {
  name: string;
  version?: string;
  description?: string;
  type?: 'module' | 'commonjs';
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  engines?: Record<string, string>;
  workspaces?: WorkspaceConfig;
}

export interface FolderStructure {
  hasSrc: boolean;
  hasFunctions: boolean;
  hasTests: boolean;
  hasApps: boolean;
  hasPackages: boolean;
  hasPublic: boolean;
  hasDocs: boolean;
  isMonorepo: boolean;
  folders: string[];
}

export type FrameworkType =
  | 'react'
  | 'vue'
  | 'angular'
  | 'svelte'
  | 'sveltekit'
  | 'astro'
  | 'nestjs'
  | 'next'
  | 'nuxt'
  | 'express'
  | 'fastify'
  | 'firebase-functions'
  | 'unknown';

export interface FrameworkInfo {
  type: FrameworkType;
  version?: string;
  confidence: 'high' | 'medium' | 'low';
  indicators: string[];
}

export type RuntimeType = 'node' | 'bun' | 'unknown';
export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown';
export type Profile = 'compact' | 'standard' | 'full';

export interface RuntimeInfo {
  type: RuntimeType;
  version?: string;
  packageManager: PackageManager;
}

export interface CanonicalCommands {
  install: string;
  dev: string | null;
  build: string | null;
  test: string | null;
  lint: string | null;
  format: string | null;
}

export interface DetectionResult {
  packageInfo: PackageInfo | null;
  folderStructure: FolderStructure;
  framework: FrameworkInfo;
  runtime: RuntimeInfo;
  commands: CanonicalCommands;
  confidence: 'high' | 'medium' | 'low';
}

export interface TemplateContext {
  project_name: string;
  project_description: string;
  generator_version: string;
  profile: Profile;
  stacks: string[];
  commands: {
    install: string;
    dev: string;
    lint: string;
    format: string;
    test: string;
    build: string;
  };
  style_notes: string;
  testing_notes: string;
  security_notes: string;
  has_dev: boolean;
  has_tests: boolean;
  has_lint: boolean;
  has_format: boolean;
  has_build: boolean;
  is_monorepo: boolean;
  isCompact: boolean;
  isStandard: boolean;
  isFull: boolean;
  isStandardOrFull: boolean;
  is_unknown_generic?: boolean;
  is_nuxt?: boolean;
  is_sveltekit?: boolean;
  framework_type: string;
  runtime_type: string;
}

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  lineCount: number;
  estimatedTokens: number;
}

export interface GenerationResult {
  content: string;
  validation: ValidationResult;
  detection: DetectionResult;
}
