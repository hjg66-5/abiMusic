use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
) -> crate::Result<Openbiliscan<R>> {
  Ok(Openbiliscan(app.clone()))
}

/// Access to the openbiliscan APIs.
pub struct Openbiliscan<R: Runtime>(AppHandle<R>);

impl<R: Runtime> Openbiliscan<R> {
  pub fn ping(&self, payload: PingRequest) -> crate::Result<PingResponse> {
    Ok(PingResponse {
      value: payload.value,
    })
  }
}
