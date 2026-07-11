package database

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB là biến toàn cục chứa kết nối database để các module khác sử dụng
var DB *gorm.DB

// ConnectDB khởi tạo kết nối đến PostgreSQL
func ConnectDB() {
	// 1. Load file .env
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Lỗi: Không thể load file .env")
	}

	// 2. Lấy cấu hình từ biến môi trường
	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	port := os.Getenv("DB_PORT")

	// 3. Chuỗi kết nối DSN (Data Source Name)
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=Asia/Ho_Chi_Minh",
		host, user, password, dbName, port)

	// 4. Mở kết nối với GORM
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info), // Bật log để thấy câu SQL Gorm sinh ra (Rất tốt khi Dev)
	})

	if err != nil {
		log.Fatal("Lỗi: Không thể kết nối Database! \n", err)
	}

	fmt.Println("🚀 Kết nối PostgreSQL thành công!")
	DB = db
}
