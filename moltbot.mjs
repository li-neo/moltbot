#!/usr/bin/env node

import module from "node:module";
import { installProcessWarningFilter } from "./dist/infra/warnings.js";

installProcessWarningFilter();

// https://nodejs.org/api/module.html#module-compile-cache
if (module.enableCompileCache && !process.env.NODE_DISABLE_COMPILE_CACHE) {
  try {
    module.enableCompileCache();
  } catch {
    // Ignore errors
  }
}

await import("./dist/entry.js");
