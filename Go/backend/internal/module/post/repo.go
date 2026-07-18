package post

import (
	"time"

	"gorm.io/gorm"
)

type PostAuthor struct {
	ID        string `gorm:"primaryKey"`
	FullName  string
	AvatarURL string
}

func (PostAuthor) TableName() string { return "users" }

type PostMedia struct {
	ID        string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	PostID    string `gorm:"type:uuid;not null"`
	MediaURL  string
	MediaType string
}

type Post struct {
	ID            string     `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID        string     `gorm:"type:uuid;not null"`
	Author        PostAuthor `gorm:"foreignKey:UserID;references:ID"`
	Content       string
	SharedPostID  *string     `gorm:"type:uuid"`
	SharedPost    *Post       `gorm:"foreignKey:SharedPostID"`
	Media         []PostMedia `gorm:"foreignKey:PostID"`
	LikesCount    int         `gorm:"default:0"`
	CommentsCount int         `gorm:"default:0"`
	SharesCount   int         `gorm:"default:0"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type PostRepository interface {
	CreatePost(post *Post) error
	CreatePostMedia(media *PostMedia) error
	IncrementShareCount(postID string) error
	GetNewsFeed(userID string, limit int, offset int) ([]Post, error)
	GetPostsByUserID(userID string, limit int, offset int) ([]Post, error)
	GetPostByID(postID string) (*Post, error)
	DeletePost(postID string, userID string) error // Đã thêm hàm Xóa
}

type postRepo struct{ db *gorm.DB }

func NewPostRepository(db *gorm.DB) PostRepository { return &postRepo{db: db} }

func (r *postRepo) CreatePost(post *Post) error            { return r.db.Create(post).Error }
func (r *postRepo) CreatePostMedia(media *PostMedia) error { return r.db.Create(media).Error }
func (r *postRepo) IncrementShareCount(postID string) error {
	return r.db.Model(&Post{}).Where("id = ?", postID).UpdateColumn("shares_count", gorm.Expr("shares_count + ?", 1)).Error
}

func (r *postRepo) GetNewsFeed(userID string, limit int, offset int) ([]Post, error) {
	var posts []Post
	err := r.db.Preload("Author").Preload("Media").Preload("SharedPost").Preload("SharedPost.Author").Preload("SharedPost.Media").
		Where("user_id = ? OR user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)", userID, userID).
		Order("created_at desc").Limit(limit).Offset(offset).Find(&posts).Error
	return posts, err
}

func (r *postRepo) GetPostsByUserID(userID string, limit int, offset int) ([]Post, error) {
	var posts []Post
	err := r.db.Preload("Author").Preload("Media").Preload("SharedPost").Preload("SharedPost.Author").Preload("SharedPost.Media").
		Where("user_id = ?", userID).Order("created_at desc").Limit(limit).Offset(offset).Find(&posts).Error
	return posts, err
}

func (r *postRepo) GetPostByID(postID string) (*Post, error) {
	var post Post
	err := r.db.Preload("Author").Preload("Media").Preload("SharedPost").Preload("SharedPost.Author").Preload("SharedPost.Media").Where("id = ?", postID).First(&post).Error
	return &post, err
}

// LOGIC XÓA BÀI VIẾT TỪ DB
func (r *postRepo) DeletePost(postID string, userID string) error {
	res := r.db.Where("id = ? AND user_id = ?", postID, userID).Delete(&Post{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
