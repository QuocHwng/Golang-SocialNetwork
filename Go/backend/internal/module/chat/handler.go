package chat

import (
	"net/http"
	"social-network/internal/pkg/response"

	"github.com/gin-gonic/gin"
)

type ChatHandler struct{ service ChatService }

func NewChatHandler(service ChatService) *ChatHandler { return &ChatHandler{service: service} }

func (h *ChatHandler) SendMessage(c *gin.Context) {
	senderID, _ := c.Get("user_id")
	receiverID := c.Param("id")
	var req SendMessageReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Dữ liệu không hợp lệ")
		return
	}

	res, err := h.service.SendMessage(senderID.(string), receiverID, req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(c, http.StatusCreated, "Đã gửi", res)
}

func (h *ChatHandler) GetMessages(c *gin.Context) {
	user1, _ := c.Get("user_id")
	user2 := c.Param("id")
	res, err := h.service.GetMessages(user1.(string), user2)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	if res == nil {
		res = []MessageRes{}
	}
	response.Success(c, http.StatusOK, "Thành công", res)
}

func (h *ChatHandler) GetContacts(c *gin.Context) {
	userID, _ := c.Get("user_id")
	res, err := h.service.GetContacts(userID.(string))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	if res == nil {
		res = []ContactRes{}
	}
	response.Success(c, http.StatusOK, "Thành công", res)
}

// MỚI: Thu hồi
func (h *ChatHandler) RecallMessage(c *gin.Context) {
	senderID, _ := c.Get("user_id")
	msgID := c.Param("msgId")

	// Cần biết xóa ở đâu để bắn thông báo cho người đó, Frontend sẽ gửi receiver_id qua Query
	receiverID := c.Query("receiver_id")

	if err := h.service.RecallMessage(msgID, senderID.(string), receiverID); err != nil {
		response.Error(c, http.StatusForbidden, err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Đã thu hồi tin nhắn", nil)
}

// MỚI: Đang gõ
func (h *ChatHandler) SendTyping(c *gin.Context) {
	senderID, _ := c.Get("user_id")
	receiverID := c.Param("id")

	h.service.SendTypingEvent(senderID.(string), receiverID)
	response.Success(c, http.StatusOK, "Ok", nil)
}
