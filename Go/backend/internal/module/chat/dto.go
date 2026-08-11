package chat

import "time"

type SendMessageReq struct {
	Content  string `json:"content"`
	ImageURL string `json:"image_url"` // MỚI: Thêm link ảnh
}

type MessageRes struct {
	ID         string    `json:"id"`
	SenderID   string    `json:"sender_id"`
	ReceiverID string    `json:"receiver_id"`
	Content    string    `json:"content"`
	ImageURL   string    `json:"image_url"` // MỚI
	CreatedAt  time.Time `json:"created_at"`
}

type ContactRes struct {
	ID        string `json:"id"`
	FullName  string `json:"full_name"`
	AvatarURL string `json:"avatar_url"`
}
