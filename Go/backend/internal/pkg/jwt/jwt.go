package jwt

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// GenerateToken tạo ra 1 thẻ bài JWT chứa ID của User, có hạn trong 7 ngày.
// Yêu cầu biến môi trường JWT_SECRET phải được cấu hình trong .env
func GenerateToken(userID string) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "", errors.New("JWT_SECRET chưa được cấu hình trong .env")
	}

	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * 24 * 7).Unix(), // Hết hạn sau 7 ngày
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// GetSecret đọc JWT_SECRET từ env, trả về error nếu chưa cấu hình.
// Dùng chung cho cả GenerateToken và middleware xác thực.
func GetSecret() (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return "", errors.New("JWT_SECRET chưa được cấu hình trong .env")
	}
	return secret, nil
}
