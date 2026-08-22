package user

type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	FullName string `json:"full_name" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type UserResponse struct {
	ID             string `json:"id"`
	Username       string `json:"username"`
	Email          string `json:"email"`
	FullName       string `json:"full_name"`
	AvatarURL      string `json:"avatar_url"`
	FollowersCount int    `json:"followers_count"`
	FollowingCount int    `json:"following_count"`
	Token          string `json:"token,omitempty"`
}

type UserProfileResponse struct {
	ID             string `json:"id"`
	Username       string `json:"username"`
	FullName       string `json:"full_name"`
	AvatarURL      string `json:"avatar_url"`
	Bio            string `json:"bio"`
	FollowersCount int    `json:"followers_count"`
	FollowingCount int    `json:"following_count"`
	IsFollowing    bool   `json:"is_following"`
	IsBlocked      bool   `json:"is_blocked"`
}

// MỚI: Dữ liệu gửi lên khi sửa Profile
type UpdateProfileRequest struct {
	FullName  string  `json:"full_name" binding:"required"`
	Bio       string  `json:"bio"`
	AvatarURL *string `json:"avatar_url"` // Dùng con trỏ để có thể truyền null (gỡ ảnh)
}
