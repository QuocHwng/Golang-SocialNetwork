package chat

import "time"

type SendMessageReq struct {
	Content  string `json:"content"`
	ImageURL string `json:"image_url"` // Link ảnh đính kèm
}

type MessageRes struct {
	ID         string    `json:"id"`
	SenderID   string    `json:"sender_id"`
	ReceiverID string    `json:"receiver_id"`
	Content    string    `json:"content"`
	ImageURL   string    `json:"image_url"`
	IsRecalled bool      `json:"is_recalled"` // true = FE hiển thị "Tin nhắn đã được thu hồi"
	CreatedAt  time.Time `json:"created_at"`
}

type ContactRes struct {
	ID          string `json:"id"`
	FullName    string `json:"full_name"`
	AvatarURL   string `json:"avatar_url"`
	IsOnline    bool   `json:"is_online"`
	UnreadCount int    `json:"unread_count"`
}

