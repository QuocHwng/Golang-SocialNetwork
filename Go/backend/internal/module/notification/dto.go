package notification

import "time"

type ActorInfo struct {
	ID        string `json:"id"`
	FullName  string `json:"full_name"`
	AvatarURL string `json:"avatar_url"`
}

type NotificationResponse struct {
	ID        string    `json:"id"`
	Actor     ActorInfo `json:"actor"`
	Type      string    `json:"type"`      // 'LIKE', 'COMMENT', 'FOLLOW'
	EntityID  string    `json:"entity_id"` // Trỏ đến ID bài viết hoặc ID người dùng tùy type
	IsRead    bool      `json:"is_read"`
	CreatedAt time.Time `json:"created_at"`
}