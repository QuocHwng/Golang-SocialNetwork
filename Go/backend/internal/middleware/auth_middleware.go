package middleware

import (
	"net/http"

	"social-network/internal/pkg/jwt"
	"social-network/internal/pkg/response"

	ginjwt "github.com/golang-jwt/jwt/v5"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string

		// 1. Ưu tiên lấy Token từ Header (Dùng cho các API bình thường)
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := splitBearer(authHeader)
			if parts != "" {
				tokenString = parts
			}
		}

		// 2. Nếu Header không có, thử lấy từ URL Query
		// (Chỉ dùng cho WebSocket vì browser không set custom header được)
		if tokenString == "" {
			tokenString = c.Query("token")
		}

		// 3. Nếu vẫn không có → Từ chối
		if tokenString == "" {
			response.Error(c, http.StatusUnauthorized, "Từ chối truy cập: Thiếu Token xác thực")
			c.Abort()
			return
		}

		// 4. Lấy secret từ env (không dùng fallback hardcode)
		secret, err := jwt.GetSecret()
		if err != nil {
			response.Error(c, http.StatusInternalServerError, "Cấu hình server lỗi: JWT_SECRET chưa được thiết lập")
			c.Abort()
			return
		}

		token, err := ginjwt.Parse(tokenString, func(token *ginjwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*ginjwt.SigningMethodHMAC); !ok {
				return nil, ginjwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			response.Error(c, http.StatusUnauthorized, "Từ chối truy cập: Token không hợp lệ hoặc đã hết hạn")
			c.Abort()
			return
		}

		claims, _ := token.Claims.(ginjwt.MapClaims)
		c.Set("user_id", claims["user_id"].(string))
		c.Next()
	}
}

// splitBearer tách chuỗi "Bearer <token>" và trả về phần token
func splitBearer(header string) string {
	const prefix = "Bearer "
	if len(header) > len(prefix) && header[:len(prefix)] == prefix {
		return header[len(prefix):]
	}
	return ""
}

