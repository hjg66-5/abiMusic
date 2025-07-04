use serde::{Deserialize, Serialize}; // 添加Deserialize导入
// use log::{debug, info, warn};  // 导入所有日志级别
use log::{info, warn};
use tauri_plugin_store::StoreExt;
use serde_json::Value;
use tauri_plugin_http::reqwest::ClientBuilder;


#[derive(Debug, Serialize, Deserialize)]
struct PollResponse {
    code: i32,
    message: String,
    ttl: i32,
    data: PollData
}

#[derive(Debug, Serialize, Deserialize)]
struct PollData {
    // 根据B站API实际返回字段调整
    code: i32,        // 0:未扫码, 86038:已扫码未确认, 0:已确认(示例)
    url: Option<String>, // 登录成功后的跳转URL
    refresh_token: Option<String>,
    timestamp: Option<u64>,
    message: String
}

#[tauri::command]
async fn poll_qr_code_status(app_handle: tauri::AppHandle, qrcode_key: &str) -> Result<PollResponse, String> {
    // 多级别日志输出确保可见
    if qrcode_key.is_empty() {
        warn!("qrcode_key为空，可能导致轮询失败");
    }

    let url = format!(
        "https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key={}",
        qrcode_key
    );

    // 创建带 cookie 存储的客户端
    let client = ClientBuilder::new()
        .cookie_store(true)
        .build()
        .map_err(|e| format!("创建客户端失败: {:?}", e))?;

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("轮询请求失败: {:?}", e))?;

    // 从响应头获取所有cookie并打印
    let cookies: Vec<String> = response.headers().get_all("Set-Cookie")
        .iter()
        .filter_map(|cookie| cookie.to_str().ok())
        .map(|s| s.to_string())
        .collect();

    if !cookies.is_empty() {
        info!("共获取到 {} 个Cookie:", cookies.len());
        for cookie in &cookies {
            info!("Cookie: {}", cookie);
        }

        // 将 cookies 存储到 hjg152.json
        let mut store = app_handle.store("hjg152.json")
            .map_err(|e| format!("打开存储失败: {}", e))?;

        let cookies_json: Value = serde_json::to_value(cookies)
            .map_err(|e| format!("转换 Cookie 为 JSON 失败: {}", e))?;

        // 分别处理存储和保存操作
        store.set("cookies", cookies_json);

        // 只对save()操作进行错误处理
        store.save()
            .map_err(|e| format!("保存存储失败: {}", e))?;
    } else {
        info!("未获取到任何Cookie");
    }

    let poll_response: PollResponse = response
        .json()
        .await
        .map_err(|e| format!("解析轮询响应失败: {:?}", e))?;

    Ok(poll_response)
}

#[tauri::command]
fn clear_cookies(app_handle: tauri::AppHandle) -> Result<(), String> {
    let mut store = app_handle.store("hjg152.json")
            .map_err(|e| format!("打开存储失败: {}", e))?;
    store.delete("cookies");
    store.clear();
    store.save();
    Ok(())
}

#[tauri::command]
fn get_cookie_from_store(app_handle: tauri::AppHandle, cookie_name: &str) -> Result<Option<String>, String> {
    // 获取存储实例
    let store = app_handle.store("hjg152.json")
        .map_err(|e| format!("无法打开存储: {}", e))?;
    
    // 从存储中获取cookies
    let cookies_value = store.get("cookies")
        .ok_or("存储中没有找到cookies")?;
    
    // 解析为字符串数组
    let cookies: Vec<String> = serde_json::from_value(cookies_value.clone())
        .map_err(|e| format!("解析cookies失败: {}", e))?;
    
    // 遍历每个cookie查找匹配项
    for cookie in cookies {
        // 分割cookie名称和值
        if let Some((name, value)) = cookie.split_once('=') {
            if name == cookie_name {
                // 移除可能的属性部分（例如; path=/）
                let value = value.split(';').next().unwrap_or("").to_string();
                return Ok(Some(value));
            }
        }
    }
    
    // 未找到匹配的cookie
    Ok(None)
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            poll_qr_code_status,
            get_cookie_from_store,
            clear_cookies
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
