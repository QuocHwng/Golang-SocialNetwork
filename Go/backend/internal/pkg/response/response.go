package response

import (
	"github.com/gin-gonic/gin"
)

// ResponseData định nghĩa cấu trúc JSON chuẩn
type ResponseData struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"` // interface{} nghĩa là có thể chứa mọi loại dữ liệu
}

// Success là hàm gọi khi API xử lý thành công
func Success(c *gin.Context, code int, message string, data interface{}) {
	c.JSON(code, ResponseData{
		Code:    code,
		Message: message,
		Data:    data,
	})
}

// Error là hàm gọi khi API xảy ra lỗi (VD: sai pass, user không tồn tại...)
func Error(c *gin.Context, code int, message string) {
	c.JSON(code, ResponseData{
		Code:    code,
		Message: message,
		Data:    nil,
	})
}
