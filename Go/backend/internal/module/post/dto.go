package post

import "time"

type CreatePostRequest struct {
	Content      string   `json:"content"`
	SharedPostID *string  `json:"shared_post_id,omitempty"`
	MediaURLs    []string `json:"media_urls"` // THÊM MỚI: Danh sách link ảnh/video
}

type PostResponse struct {
	ID            string    `json:"id"`
	UserID        string    `json:"user_id"`
	Content       string    `json:"content"`
	SharedPostID  *string   `json:"shared_post_id,omitempty"`
	MediaURLs     []string  `json:"media_urls,omitempty"`
	LikesCount    int       `json:"likes_count"`
	CommentsCount int       `json:"comments_count"`
	SharesCount   int       `json:"shares_count"`
	CreatedAt     time.Time `json:"created_at"`
}

type AuthorInfo struct {
	ID        string `json:"id"`
	FullName  string `json:"full_name"`
	AvatarURL string `json:"avatar_url"`
}

// THÊM MỚI: Cấu trúc trả về Ảnh/Video
type MediaInfo struct {
	ID        string `json:"id"`
	MediaURL  string `json:"media_url"`
	MediaType string `json:"media_type"`
}

type FeedPostResponse struct {
	ID            string            `json:"id"`
	Author        AuthorInfo        `json:"author"`
	Content       string            `json:"content"`
	SharedPost    *FeedPostResponse `json:"shared_post,omitempty"`
	Media         []MediaInfo       `json:"media"` // THÊM MỚI
	LikesCount    int               `json:"likes_count"`
	CommentsCount int               `json:"comments_count"`
	SharesCount   int               `json:"shares_count"`
	CreatedAt     time.Time         `json:"created_at"`
}
