package post

import (
	"time"

	"gorm.io/gorm"
)

// PostAuthor là view rút gọn của User, dùng để Preload thông tin tác giả khi lấy bài viết
type PostAuthor struct {
	ID        string `gorm:"primaryKey"`
	FullName  string
	AvatarURL string
}

func (PostAuthor) TableName() string { return "users" }

// PostMedia lưu trữ ảnh và video đính kèm của bài viết
type PostMedia struct {
	ID        string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	PostID    string `gorm:"type:uuid;not null"`
	MediaURL  string
	MediaType string // "image" hoặc "video"
}

// Post là model chính đại diện cho một bài viết
type Post struct {
	ID            string      `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	UserID        string      `gorm:"type:uuid;not null"`
	Author        PostAuthor  `gorm:"foreignKey:UserID;references:ID"`
	Content       string
	SharedPostID  *string     `gorm:"type:uuid"`
	SharedPost    *Post       `gorm:"foreignKey:SharedPostID"`
	GroupID       *string     `gorm:"type:uuid;index"` // Lưu ID của nhóm nếu đăng trong nhóm
	Media         []PostMedia `gorm:"foreignKey:PostID"`
	LikesCount    int         `gorm:"default:0"`
	CommentsCount int         `gorm:"default:0"`
	SharesCount   int         `gorm:"default:0"`
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

// SavedPost đại diện cho bài viết được lưu (bookmark)
type SavedPost struct {
	UserID    string    `gorm:"type:uuid;primaryKey"`
	PostID    string    `gorm:"type:uuid;primaryKey"`
	CreatedAt time.Time
}

// PostReport đại diện cho báo cáo bài viết vi phạm
type PostReport struct {
	ID         string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	ReporterID string    `gorm:"type:uuid;not null"`
	PostID     string    `gorm:"type:uuid;not null"`
	Reason     string    `gorm:"type:text"`
	CreatedAt  time.Time
}

type PostRepository interface {
	CreatePost(post *Post) error
	CreatePostMedia(media *PostMedia) error
	IncrementShareCount(postID string) error
	GetNewsFeed(userID string, limit int, offset int) ([]Post, error)
	GetPostsByUserID(userID string, limit int, offset int) ([]Post, error)
	GetPostByID(postID string) (*Post, error)
	DeletePost(postID string, userID string) error
	UpdatePost(postID string, userID string, content string) error
	GetGroupPosts(groupID string, limit int, offset int) ([]Post, error)
	CheckGroupMember(groupID string, userID string) bool

	// Features mới: Bookmark bài viết
	ToggleSavePost(userID, postID string) (bool, error)
	GetSavedPosts(userID string, limit int, offset int) ([]Post, error)

	// Features: Search và Report
	SearchPosts(keyword string, limit int, offset int) ([]Post, error)
	ReportPost(report *PostReport) error
}

type postRepo struct{ db *gorm.DB }

func NewPostRepository(db *gorm.DB) PostRepository {
	db.AutoMigrate(&SavedPost{}, &PostReport{}) // Tự động tạo bảng
	return &postRepo{db: db}
}

func (r *postRepo) CreatePost(post *Post) error            { return r.db.Create(post).Error }
func (r *postRepo) CreatePostMedia(media *PostMedia) error { return r.db.Create(media).Error }

func (r *postRepo) IncrementShareCount(postID string) error {
	return r.db.Model(&Post{}).Where("id = ?", postID).
		UpdateColumn("shares_count", gorm.Expr("shares_count + ?", 1)).Error
}

// GetNewsFeed lấy bài viết của người dùng và những người họ đang follow.
// Chỉ lấy bài không thuộc nhóm (group_id IS NULL) cho trang chủ.
func (r *postRepo) GetNewsFeed(userID string, limit int, offset int) ([]Post, error) {
	var posts []Post
	err := r.db.Preload("Author").Preload("Media").
		Preload("SharedPost").Preload("SharedPost.Author").Preload("SharedPost.Media").
		Where("(user_id = ? OR user_id IN (SELECT following_id FROM follows WHERE follower_id = ?)) AND group_id IS NULL", userID, userID).
		Order("created_at desc").Limit(limit).Offset(offset).Find(&posts).Error
	return posts, err
}

func (r *postRepo) GetPostsByUserID(userID string, limit int, offset int) ([]Post, error) {
	var posts []Post
	err := r.db.Preload("Author").Preload("Media").
		Preload("SharedPost").Preload("SharedPost.Author").Preload("SharedPost.Media").
		Where("user_id = ? AND group_id IS NULL", userID).
		Order("created_at desc").Limit(limit).Offset(offset).Find(&posts).Error
	return posts, err
}

func (r *postRepo) GetPostByID(postID string) (*Post, error) {
	var post Post
	err := r.db.Preload("Author").Preload("Media").
		Preload("SharedPost").Preload("SharedPost.Author").Preload("SharedPost.Media").
		Where("id = ?", postID).First(&post).Error
	return &post, err
}

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

func (r *postRepo) UpdatePost(postID string, userID string, content string) error {
	res := r.db.Model(&Post{}).Where("id = ? AND user_id = ?", postID, userID).Update("content", content)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (r *postRepo) GetGroupPosts(groupID string, limit int, offset int) ([]Post, error) {
	var posts []Post
	err := r.db.Preload("Author").Preload("Media").
		Preload("SharedPost").Preload("SharedPost.Author").Preload("SharedPost.Media").
		Where("group_id = ?", groupID).
		Order("created_at desc").Limit(limit).Offset(offset).Find(&posts).Error
	return posts, err
}

// CheckGroupMember kiểm tra xem user có phải thành viên đã duyệt của nhóm không
func (r *postRepo) CheckGroupMember(groupID string, userID string) bool {
	var count int64
	r.db.Table("group_members").
		Where("group_id = ? AND user_id = ? AND status = 'approved'", groupID, userID).
		Count(&count)
	return count > 0
}

func (r *postRepo) ToggleSavePost(userID, postID string) (bool, error) {
	var saved SavedPost
	err := r.db.Where("user_id = ? AND post_id = ?", userID, postID).First(&saved).Error

	if err == nil {
		// Đã lưu -> Bỏ lưu
		if err := r.db.Delete(&saved).Error; err != nil {
			return false, err
		}
		return false, nil
	} else if err == gorm.ErrRecordNotFound {
		// Chưa lưu -> Lưu bài
		newSaved := SavedPost{UserID: userID, PostID: postID}
		if err := r.db.Create(&newSaved).Error; err != nil {
			return false, err
		}
		return true, nil
	}
	return false, err
}

func (r *postRepo) GetSavedPosts(userID string, limit int, offset int) ([]Post, error) {
	var posts []Post
	err := r.db.
		Joins("JOIN saved_posts ON saved_posts.post_id = posts.id").
		Preload("Author").Preload("Media").
		Preload("SharedPost").Preload("SharedPost.Author").Preload("SharedPost.Media").
		Where("saved_posts.user_id = ?", userID).
		Order("saved_posts.created_at desc").
		Limit(limit).Offset(offset).Find(&posts).Error
	return posts, err
}

func (r *postRepo) SearchPosts(keyword string, limit int, offset int) ([]Post, error) {
	var posts []Post
	err := r.db.Preload("Author").Preload("Media").
		Preload("SharedPost").Preload("SharedPost.Author").Preload("SharedPost.Media").
		Where("content ILIKE ? AND group_id IS NULL", "%"+keyword+"%").
		Order("created_at desc").Limit(limit).Offset(offset).Find(&posts).Error
	return posts, err
}

func (r *postRepo) ReportPost(report *PostReport) error {
	return r.db.Create(report).Error
}
