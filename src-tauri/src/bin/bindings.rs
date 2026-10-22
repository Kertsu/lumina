//! Headless binding export: never calls run or constructs a Tauri application.

fn main() -> Result<(), Box<dyn std::error::Error>> {
  let path = std::env::args_os().nth(1).ok_or("expected an output path")?;
  lumina_lib::export_bindings(std::path::Path::new(&path))
}
