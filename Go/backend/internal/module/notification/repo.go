package notification

import (
	"time"

	"gorm.io/gorm"
)

// Dùng để JOIN lấy thông tin người gây ra thông báo (VD: Người vừa bấm Like)
type NotificationActor struct {
	ID        string `gorm:"primaryKey"`
	FullName  string
	AvatarURL string
}

func (NotificationActor) TableName() string { return "users" }

// Model ánh xạ với bảng `notifications`
type Notification struct {
	ID          string            `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	RecipientID string            `gorm:"type:uuid;not null"` // Người nhận
	ActorID     string            `gorm:"type:uuid;not null"` // Người thực hiện
	Actor       NotificationActor `gorm:"foreignKey:ActorID;references:ID"`
	Type        string            `gorm:"not null"`  // 'LIKE', 'COMMENT', 'FOLLOW'
	EntityID    string            `gorm:"type:uuid"` // ID của Post hoặc Comment
	IsRead      bool              `gorm:"default:false"`
	CreatedAt   time.Time
}

type NotificationRepository interface {
	CreateNotification(noti *Notification) error
	GetByUserID(userID string) ([]Notification, error)
	MarkAsRead(notiID string, userID string) error
}

type notificationRepo struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) NotificationRepository {
	return &notificationRepo{db: db}
}

// Tạo thông báo mới
func (r *notificationRepo) CreateNotification(noti *Notification) error {
	return r.db.Create(noti).Error
}

// Lấy danh sách thông báo của 1 user
func (r *notificationRepo) GetByUserID(userID string) ([]Notification, error) {
	var notis []Notification
	err := r.db.Preload("Actor").
		Where("recipient_id = ?", userID).
		Order("created_at desc").
		Find(&notis).Error
	return notis, err
}

// 3. Đánh dấu đã đọc
func (r *notificationRepo) MarkAsRead(notiID string, userID string) error {
	return r.db.Model(&Notification{}).
		Where("id = ? AND recipient_id = ?", notiID, userID).
		Update("is_read", true).Error
}
