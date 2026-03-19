// Monorepo entry point for the patient app Android build.
// This file is placed at the monorepo root because Metro's export:embed
// resolves entry files from the Metro projectRoot (monorepo root), not
// from the Gradle working directory (apps/patient/).
//
// The Gradle build.gradle sets entryFile to apps/patient/entry.js, which
// is made relative via cliPath to 'apps/patient/entry.js'. Metro then
// resolves './apps/patient/entry.js' from the monorepo root.
//
// But actually, the cliPath gives just 'entry.js' since root is
// apps/patient/. Metro then resolves from its own root (monorepo root).
// So this file at cliniq.one ag/entry.js catches that resolution.
require('expo-router/entry');
