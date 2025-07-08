package main

import (
  "encoding/json"
  "log"
  "net/http"
)

// 添加CORS中间件
func corsMiddleware(next http.Handler) http.Handler {
  return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    // 允许所有源（开发环境），生产环境应指定具体域名
    // w.Header().Set("Access-Control-Allow-Origin", "*")
    w.Header().Set("Access-Control-Allow-Origin", "http://localhost:1420")
    // 允许的请求方法
    w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    // 允许的请求头
    w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

    // 处理预检请求（OPTIONS）
    if r.Method == "OPTIONS" {
      w.WriteHeader(http.StatusOK)
      return
    }

    next.ServeHTTP(w, r)
  })
}

type Message struct {
  Content string `json:"content"`
}

func main() {
  // 创建路由并应用CORS中间件
  mux := http.NewServeMux()
  mux.HandleFunc("/api/hello", func(w http.ResponseWriter, r *http.Request) {
    var msg Message
    _ = json.NewDecoder(r.Body).Decode(&msg)
    
    response := map[string]string{"reply": "Hello from Golang: " + msg.Content}
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
  })

  // 使用CORS中间件包装路由
  server := &http.Server{
    Addr:    ":8080",
    Handler: corsMiddleware(mux),
  }

  log.Println("Server starting on :8080")
  log.Fatal(server.ListenAndServe())
}
