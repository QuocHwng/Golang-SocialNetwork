package chat

import (
	"time"

	"gorm.io/gorm"
)

type Message struct {
	ID         string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	SenderID   string `gorm:"type:uuid;not null;index"`
	ReceiverID string `gorm:"type:uuid;not null;index"`
	Content    string
	ImageURL   string    // MỚI: Link ảnh
	CreatedAt  time.Time `gorm:"index"`
}

type ChatRepository interface {
	SaveMessage(msg *Message) error
	GetMessages(user1, user2 string) ([]Message, error)
	GetContactIDs(userID string) ([]string, error)
	DeleteMessage(msgID, senderID string) error // MỚI: Thu hồi tin nhắn
}

type chatRepo struct{ db *gorm.DB }

func NewChatRepository(db *gorm.DB) ChatRepository {
	db.AutoMigrate(&Message{}) // Tự động thêm cột ImageURL vào DB
	return &chatRepo{db: db}
}

func (r *chatRepo) SaveMessage(msg *Message) error {
	return r.db.Create(msg).Error
}

func (r *chatRepo) GetMessages(user1, user2 string) ([]Message, error) {
	var msgs []Message
	err := r.db.Where("(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)", user1, user2, user2, user1).
		Order("created_at asc").Find(&msgs).Error
	return msgs, err
}

func (r *chatRepo) GetContactIDs(userID string) ([]string, error) {
	var ids []string
	query := `SELECT DISTINCT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END FROM messages WHERE sender_id = ? OR receiver_id = ?`
	err := r.db.Raw(query, userID, userID, userID).Scan(&ids).Error
	return ids, err
}

// MỚI: Logic xóa (chỉ được xóa tin nhắn của chính mình gửi)
func (r *chatRepo) DeleteMessage(msgID, senderID string) error {
	res := r.db.Where("id = ? AND sender_id = ?", msgID, senderID).Delete(&Message{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
