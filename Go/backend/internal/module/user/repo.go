package user

import (
	"fmt"
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
	UpdateProfile(userID string, data map[string]interface{}) error
	// Lấy danh sách người follow / đang follow của một user
	GetFollowers(userID string) ([]User, error)
	GetFollowing(userID string) ([]User, error)

	ToggleBlock(blockerID, blockedID string) (bool, error)
	GetBlockedUsers(userID string) ([]User, error)
	CheckIsBlocked(userA, userB string) bool
}

type userRepo struct{ db *gorm.DB }

func NewUserRepository(db *gorm.DB) UserRepository { 
	if err := db.AutoMigrate(&User{}, &BlockedUser{}); err != nil {
		fmt.Printf("AutoMigrate User/BlockedUser failed: %v\n", err)
	}
	return &userRepo{db: db} 
}

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

// GetFollowers lấy danh sách người đang follow userID (họ follow mình)
func (r *userRepo) GetFollowers(userID string) ([]User, error) {
	var users []User
	err := r.db.
		Joins("JOIN follows ON follows.follower_id = users.id").
		Where("follows.following_id = ?", userID).
		Find(&users).Error
	return users, err
}

// GetFollowing lấy danh sách người mà userID đang follow (mình follow họ)
func (r *userRepo) GetFollowing(userID string) ([]User, error) {
	var users []User
	err := r.db.
		Joins("JOIN follows ON follows.following_id = users.id").
		Where("follows.follower_id = ?", userID).
		Find(&users).Error
	return users, err
}

// BlockedUser đại diện cho danh sách người bị chặn
type BlockedUser struct {
	BlockerID string    `gorm:"type:uuid;primaryKey"`
	BlockedID string    `gorm:"type:uuid;primaryKey"`
	CreatedAt time.Time
}

func (r *userRepo) ToggleBlock(blockerID, blockedID string) (bool, error) {
	var blocked BlockedUser
	err := r.db.Where("blocker_id = ? AND blocked_id = ?", blockerID, blockedID).First(&blocked).Error

	if err == nil {
		// Đã chặn -> Bỏ chặn
		if err := r.db.Delete(&blocked).Error; err != nil {
			return false, err
		}
		return false, nil
	} else if err == gorm.ErrRecordNotFound {
		// Chưa chặn -> Chặn
		newBlock := BlockedUser{BlockerID: blockerID, BlockedID: blockedID}
		if err := r.db.Create(&newBlock).Error; err != nil {
			return false, err
		}
		
		// Xóa follow 2 chiều nếu có khi block
		r.db.Exec("DELETE FROM follows WHERE (follower_id = ? AND following_id = ?) OR (follower_id = ? AND following_id = ?)", blockerID, blockedID, blockedID, blockerID)
		
		return true, nil
	}
	return false, err
}

func (r *userRepo) GetBlockedUsers(userID string) ([]User, error) {
	var users []User
	err := r.db.
		Joins("JOIN blocked_users ON blocked_users.blocked_id = users.id").
		Where("blocked_users.blocker_id = ?", userID).
		Find(&users).Error
	return users, err
}

func (r *userRepo) CheckIsBlocked(userA, userB string) bool {
	var count int64
	r.db.Table("blocked_users").
		Where("(blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)", userA, userB, userB, userA).
		Count(&count)
	return count > 0
}
