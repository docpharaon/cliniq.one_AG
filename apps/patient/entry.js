// This file is a local entry point for the Android release build.
// It re-exports from expo-router's entry module to work around a
// monorepo path resolution issue where the hoisted entry file
// (../../node_modules/expo-router/entry.js) can't be resolved by
// Metro's export:embed command during Gradle's bundling step.
require('expo-router/entry');
