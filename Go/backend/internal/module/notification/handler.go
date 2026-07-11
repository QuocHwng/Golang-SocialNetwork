package notification

import (
	"net/http"
	"social-network/internal/pkg/response"

	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	service NotificationService
}

func NewNotificationHandler(service NotificationService) *NotificationHandler {
	return &NotificationHandler{service: service}
}

// GET /notifications
func (h *NotificationHandler) GetMyNotifications(c *gin.Context) {
	userID, _ := c.Get("user_id")

	res, err := h.service.GetMyNotifications(userID.(string))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	// Nếu mảng rỗng thì trả về mảng [] chứ không trả về null
	if res == nil {
		res = []NotificationResponse{}
	}

	response.Success(c, http.StatusOK, "Thành công", res)
}

// PUT /notifications/:id/read
func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	userID, _ := c.Get("user_id")
	notiID := c.Param("id")

	err := h.service.MarkAsRead(notiID, userID.(string))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Đã đánh dấu đọc", nil)
}
