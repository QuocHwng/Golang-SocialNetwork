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

type Post struct {
	ID            string     `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID        string     `gorm:"type:uuid;not null"`
	Author        PostAuthor `gorm:"foreignKey:UserID;references:ID"`
	Content       string
	SharedPostID  *string `gorm:"type:uuid"`
	SharedPost    *Post   `gorm:"foreignKey:SharedPostID"`
	LikesCount    int     `gorm:"default:0"`
	CommentsCount int     `gorm:"default:0"`
	SharesCount   int     `gorm:"default:0"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type PostRepository interface {
	CreatePost(post *Post) error
	IncrementShareCount(postID string) error
	GetNewsFeed(limit int, offset int) ([]Post, error)
	GetPostByID(postID string) (*Post, error) // <-- THÊM MỚI
}

type postRepo struct {
	db *gorm.DB
}

func NewPostRepository(db *gorm.DB) PostRepository {
	return &postRepo{db: db}
}

func (r *postRepo) CreatePost(post *Post) error {
	return r.db.Create(post).Error
}

func (r *postRepo) IncrementShareCount(postID string) error {
	return r.db.Model(&Post{}).Where("id = ?", postID).UpdateColumn("shares_count", gorm.Expr("shares_count + ?", 1)).Error
}

func (r *postRepo) GetNewsFeed(limit int, offset int) ([]Post, error) {
	var posts []Post
	err := r.db.Preload("Author").Preload("SharedPost").Preload("SharedPost.Author").Order("created_at desc").Limit(limit).Offset(offset).Find(&posts).Error
	return posts, err
}

// HÀM MỚI: Lấy chi tiết 1 bài viết
func (r *postRepo) GetPostByID(postID string) (*Post, error) {
	var post Post
	err := r.db.Preload("Author").Preload("SharedPost").Preload("SharedPost.Author").Where("id = ?", postID).First(&post).Error
	return &post, err
}
