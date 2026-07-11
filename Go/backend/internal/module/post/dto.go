package post

import "time"

// Dữ liệu ReactJS gửi lên khi đăng bài
type CreatePostRequest struct {
	Content      string  `json:"content" binding:"required"`
	SharedPostID *string `json:"shared_post_id,omitempty"`
	// Tạm thời ta làm content text trước, phần upload ảnh Media ta sẽ làm sau để tránh phức tạp
}

// Dữ liệu Backend trả về cho ReactJS
type PostResponse struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	Content       string    `json:"content"`
	LikesCount    int       `json:"likes_count"`
	CommentsCount int       `json:"comments_count"`
	CreatedAt     time.Time `json:"created_at"`
	SharedPostID  *string   `json:"shared_post_id,omitempty"`
	SharesCount   int       `json:"shares_count"`
}

// Cấu trúc thông tin tác giả trả về cho ReactJS
type AuthorInfo struct {
	ID        string `json:"id"`
	FullName  string `json:"full_name"`
	AvatarURL string `json:"avatar_url"`
}

// Cấu trúc Bài viết hoàn chỉnh hiển thị trên bảng tin
type FeedPostResponse struct {
	ID            string            `json:"id"`
	Author        AuthorInfo        `json:"author"`
	Content       string            `json:"content"`
	SharedPost    *FeedPostResponse `json:"shared_post,omitempty"` // Bài gốc lồng bên trong
	LikesCount    int               `json:"likes_count"`
	CommentsCount int               `json:"comments_count"`
	SharesCount   int               `json:"shares_count"`
	CreatedAt     time.Time         `json:"created_at"`
}