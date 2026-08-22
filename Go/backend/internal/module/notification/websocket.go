package notification

import (
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Cho phép mọi origin (Bỏ qua lỗi CORS khi ReactJS kết nối)
	},
}

// Hub là trạm quản lý danh sách các user đang online
type Hub struct {
	sync.RWMutex
	Clients map[string]*websocket.Conn // Lưu trữ: userID -> Kết nối của họ
}

// Khởi tạo một Hub dùng chung cho toàn bộ dự án
var SharedHub = &Hub{
	Clients: make(map[string]*websocket.Conn),
}

// SendToUser là hàm để gửi tin nhắn đến 1 user (Nếu họ đang online)
func (h *Hub) SendToUser(userID string, message interface{}) {
	h.RLock()
	defer h.RUnlock()

	// Nếu tìm thấy user này đang online thì gửi data qua mạng
	if conn, ok := h.Clients[userID]; ok {
		_ = conn.WriteJSON(message)
	}
}

// IsOnline kiểm tra user có đang kết nối Websocket không
func (h *Hub) IsOnline(userID string) bool {
	h.RLock()
	defer h.RUnlock()
	_, ok := h.Clients[userID]
	return ok
}

// Broadcast gửi tin nhắn cho toàn bộ user đang online
func (h *Hub) Broadcast(message interface{}) {
	h.RLock()
	defer h.RUnlock()
	for _, conn := range h.Clients {
		_ = conn.WriteJSON(message)
	}
}

// ServeWS là API đón người dùng vào kết nối Realtime
func ServeWS(c *gin.Context) {
	// Lấy ID người dùng từ Middleware
	userID, exists := c.Get("user_id")
	if !exists { return }

	// Nâng cấp từ HTTP lên WebSocket (Đường hầm kết nối liên tục)
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil { return }

	// Lưu user vào trạm phát sóng
	SharedHub.Lock()
	SharedHub.Clients[userID.(string)] = conn
	SharedHub.Unlock()

	SharedHub.Broadcast(map[string]interface{}{
		"event":   "USER_ONLINE",
		"user_id": userID,
	})

	// Lắng nghe khi user thoát web (Đóng kết nối) thì xóa họ khỏi trạm
	go func() {
		defer func() {
			SharedHub.Lock()
			delete(SharedHub.Clients, userID.(string))
			SharedHub.Unlock()
			conn.Close()

			SharedHub.Broadcast(map[string]interface{}{
				"event":   "USER_OFFLINE",
				"user_id": userID,
			})
		}()
		for {
			// Nhận tin nhắn rác để giữ kết nối sống (Ping/Pong)
			if _, _, err := conn.ReadMessage(); err != nil { break }
		}
	}()
}
