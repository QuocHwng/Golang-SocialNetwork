package chat

import (
	"time"

	"gorm.io/gorm"
)

type Message struct {
	ID         string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	SenderID   string    `gorm:"type:uuid;not null;index"`
	ReceiverID string    `gorm:"type:uuid;not null;index"`
	Content    string
	ImageURL   string    // Link ảnh đính kèm
	IsRecalled bool      `gorm:"default:false"` // true = tin nhắn đã bị thu hồi (soft delete)
	CreatedAt  time.Time `gorm:"index"`
}

// ContactUser là view rút gọn của User, dùng để lấy thông tin liên hệ
type ContactUser struct {
	ID        string `gorm:"primaryKey"`
	FullName  string
	AvatarURL string
}

func (ContactUser) TableName() string { return "users" }

type ChatRepository interface {
	SaveMessage(msg *Message) error
	GetMessages(user1, user2 string) ([]Message, error)
	GetContactIDs(userID string) ([]string, error)
	// FindContactsByIDs trả về thông tin user theo danh sách IDs — dùng thay cho N+1 query
	FindContactsByIDs(ids []string) ([]ContactUser, error)
	RecallMessage(msgID, senderID string) error // Soft-delete: đánh dấu thu hồi, không xóa DB
}

type chatRepo struct{ db *gorm.DB }

// NewChatRepository khởi tạo repository cho Chat.
// AutoMigrate được giữ tạm thời để thêm cột IsRecalled vào bảng messages hiện có.
func NewChatRepository(db *gorm.DB) ChatRepository {
	db.AutoMigrate(&Message{})
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

// FindContactsByIDs lấy thông tin nhiều user cùng lúc bằng 1 query — thay cho N+1
func (r *chatRepo) FindContactsByIDs(ids []string) ([]ContactUser, error) {
	if len(ids) == 0 {
		return []ContactUser{}, nil
	}
	var users []ContactUser
	err := r.db.Where("id IN ?", ids).Find(&users).Error
	return users, err
}

// RecallMessage đánh dấu tin nhắn là đã thu hồi (soft delete).
// Chỉ người gửi mới có quyền thu hồi tin nhắn của chính mình.
func (r *chatRepo) RecallMessage(msgID, senderID string) error {
	res := r.db.Model(&Message{}).
		Where("id = ? AND sender_id = ?", msgID, senderID).
		Update("is_recalled", true)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
