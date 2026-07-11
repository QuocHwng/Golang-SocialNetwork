package jwt

import (
	"os"
	"time"
	"github.com/golang-jwt/jwt/v5"
)

// GenerateToken tạo ra 1 thẻ bài JWT chứa ID của User, có hạn trong 7 ngày
func GenerateToken(userID string) (string, error) {
	// Lấy mã bí mật từ file .env (nếu không có thì dùng mặc định)
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "bi_mat_cua_du_an_mang_xa_hoi_123"
	}

	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * 24 * 7).Unix(), // Hết hạn sau 7 ngày
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
