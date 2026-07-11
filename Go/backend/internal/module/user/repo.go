package user

import (
	"time"

	"gorm.io/gorm"
)


// User là Model ánh xạ (map) trực tiếp với bảng `users` trong PostgreSQL
type User struct {
	ID             string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Username       string `gorm:"unique;not null"`
	Email          string `gorm:"unique;not null"`
	PasswordHash   string `gorm:"not null"`
	FullName       string `gorm:"not null"`
	AvatarURL      string
	Bio            string
	FollowersCount int `gorm:"default:0"`
	FollowingCount int `gorm:"default:0"`
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// Interface định nghĩa các hàm mà Repo này có thể làm (Chuẩn chuyên nghiệp của Go)
type UserRepository interface {
	CreateUser(user *User) error
	FindByEmail(email string) (*User, error)
	FindByUsername(username string) (*User, error)

	FindByID(id string) (*User, error)
}

type userRepo struct {
	db *gorm.DB
}

// NewUserRepository là hàm khởi tạo
func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepo{db: db}
}

// --- Các hàm thao tác với DB ---

func (r *userRepo) CreateUser(user *User) error {
	return r.db.Create(user).Error
}

func (r *userRepo) FindByEmail(email string) (*User, error) {
	var user User
	err := r.db.Where("email = ?", email).First(&user).Error
	return &user, err
}

func (r *userRepo) FindByUsername(username string) (*User, error) {
	var user User
	err := r.db.Where("username = ?", username).First(&user).Error
	return &user, err
}

func (r *userRepo) FindByID(id string) (*User, error) {
	var user User
	err := r.db.Where("id = ?", id).First(&user).Error
	return &user, err
}
