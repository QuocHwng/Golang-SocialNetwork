package main

import (
	"fmt"

	"social-network/internal/pkg/database"
	"social-network/internal/server"
)

func main() {
	fmt.Println(" Đang khởi động ")

	// 1. Khởi tạo kết nối Database
	database.ConnectDB()

	// 2. Khởi tạo toàn bộ Router
	router := server.SetupRouter()

	// 3. Chạy Server
	fmt.Println("Server API đang chạy tại: http://localhost:8080")
	router.Run(":8080")
}
