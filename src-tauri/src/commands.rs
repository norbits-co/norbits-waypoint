//! The IPC surface: everything the frontend can call.
//!
//! These are deliberately thin. A command translates arguments, calls into `services`, and returns - no logic lives here, so nothing the app does is
//! trapped behind a Tauri runtime and out of reach of a test.
//!
//! Mirrors `src/api/commands.ts` on the frontend.

pub mod install;
pub mod manifest;
pub mod minecraft;
pub mod open;
