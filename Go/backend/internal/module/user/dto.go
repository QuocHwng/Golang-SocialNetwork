package user

// 1. Dữ liệu ReactJS gửi lên khi Đăng ký
type RegisterRequest struct {
	Username string `json:"username" binding:"required,min=3,max=50"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	FullName string `json:"full_name" binding:"required"`
	
}

// 2. Dữ liệu ReactJS gửi lên khi Đăng nhập
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// 3. Dữ liệu Backend trả về cho ReactJS (tuyệt đối không có password)
type UserResponse struct {
	ID             string `json:"id"`
	Username       string `json:"username"`
	Email          string `json:"email"`
	FullName       string `json:"full_name"`
	AvatarURL      string `json:"avatar_url"`
	FollowersCount int    `json:"followers_count"`
	FollowingCount int    `json:"following_count"`
	Token          string `json:"token,omitempty"` // Thẻ bài JWT (có thể rỗng nếu chỉ xem profile)
}
