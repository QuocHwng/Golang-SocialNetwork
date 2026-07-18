package user

import (
	"time"

	"gorm.io/gorm"
)

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

type UserRepository interface {
	CreateUser(user *User) error
	FindByEmail(email string) (*User, error)
	FindByUsername(username string) (*User, error)
	FindByID(id string) (*User, error)
	SearchUsers(keyword string) ([]User, error)
	CheckIsFollowing(followerID, followingID string) bool
	UpdateProfile(userID string, data map[string]interface{}) error // MỚI
}

type userRepo struct{ db *gorm.DB }

func NewUserRepository(db *gorm.DB) UserRepository { return &userRepo{db: db} }

func (r *userRepo) CreateUser(user *User) error { return r.db.Create(user).Error }
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
func (r *userRepo) SearchUsers(keyword string) ([]User, error) {
	var users []User
	err := r.db.Where("username ILIKE ? OR full_name ILIKE ?", "%"+keyword+"%", "%"+keyword+"%").Limit(10).Find(&users).Error
	return users, err
}
func (r *userRepo) CheckIsFollowing(followerID, followingID string) bool {
	var count int64
	r.db.Table("follows").Where("follower_id = ? AND following_id = ?", followerID, followingID).Count(&count)
	return count > 0
}

// MỚI: Cập nhật thông tin
func (r *userRepo) UpdateProfile(userID string, data map[string]interface{}) error {
	return r.db.Model(&User{}).Where("id = ?", userID).Updates(data).Error
}
