import { invoke } from '@tauri-apps/api/core'

export async function ping(value: string): Promise<string | null> {
  return await invoke<{value?: string}>('plugin:example|ping', {
    payload: {
      value,
    },
  }).then((r) => (r.value ? r.value : null));
}


export async function toast(value: string): Promise<void> {
    await invoke<{ value?: string }>("plugin:example|toast", {
        payload: {
            value,
        },
    }).then((r) => (r.value ? r.value : null));
}