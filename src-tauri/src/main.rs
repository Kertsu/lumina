// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() -> std::process::ExitCode {
  match lumina_lib::run() {
    Ok(()) => std::process::ExitCode::SUCCESS,
    Err(error) => {
      lumina_lib::report_error("native runtime", &error);
      std::process::ExitCode::FAILURE
    }
  }
}
