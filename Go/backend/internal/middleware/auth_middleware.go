package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"

	"social-network/internal/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string

		// 1. Ưu tiên lấy Token từ Header (Dùng cho các API bình thường)
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString = parts[1]
			}
		}

		// 2. Nếu Header không có, thử lấy từ URL Query (Dùng cho kết nối WebSocket từ ReactJS)
		if tokenString == "" {
			tokenString = c.Query("token")
		}

		// 3. Nếu vẫn không có -> Đuổi về
		if tokenString == "" {
			response.Error(c, http.StatusUnauthorized, "Từ chối truy cập: Thiếu Token xác thực")
			c.Abort()
			return
		}

		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			secret = "bi_mat_cua_du_an_mang_xa_hoi_123"
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("phương thức ký không hợp lệ")
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			response.Error(c, http.StatusUnauthorized, "Từ chối truy cập: Token không hợp lệ hoặc đã hết hạn")
			c.Abort()
			return
		}

		claims, _ := token.Claims.(jwt.MapClaims)
		c.Set("user_id", claims["user_id"].(string))
		c.Next()
	}
}
