package interaction

import "time"

// --- LIKE ---
type ToggleLikeResponse struct {
	PostID  string `json:"post_id"`
	IsLiked bool   `json:"is_liked"`
}


// --- COMMENT ---
type CreateCommentRequest struct {
	Content  string  `json:"content" binding:"required"`
	ParentID *string `json:"parent_id,omitempty"`
}

type CommentAuthorInfo struct {
	ID        string `json:"id"`
	FullName  string `json:"full_name"`
	AvatarURL string `json:"avatar_url"`
}

type CommentResponse struct {
	ID        string            `json:"id"`
	PostID    string            `json:"post_id"`
	Content   string            `json:"content"`
	ParentID  *string           `json:"parent_id,omitempty"`
	Author    CommentAuthorInfo `json:"author"`
	CreatedAt time.Time         `json:"created_at"`
}

// --- FOLLOW (MỚI) ---
type ToggleFollowResponse struct {
	UserID      string `json:"user_id"` // ID của người được theo dõi
	IsFollowing bool   `json:"is_following"`
}