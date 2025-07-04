use tauri::{
  plugin::{Builder, TauriPlugin},
  Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::Openbiliscan;
#[cfg(mobile)]
use mobile::Openbiliscan;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the openbiliscan APIs.
pub trait OpenbiliscanExt<R: Runtime> {
  fn openbiliscan(&self) -> &Openbiliscan<R>;
}

impl<R: Runtime, T: Manager<R>> crate::OpenbiliscanExt<R> for T {
  fn openbiliscan(&self) -> &Openbiliscan<R> {
    self.state::<Openbiliscan<R>>().inner()
  }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("openbiliscan")
    .invoke_handler(tauri::generate_handler![commands::ping])
    .setup(|app, api| {
      #[cfg(mobile)]
      let openbiliscan = mobile::init(app, api)?;
      #[cfg(desktop)]
      let openbiliscan = desktop::init(app, api)?;
      app.manage(openbiliscan);
      Ok(())
    })
    .build()
}
