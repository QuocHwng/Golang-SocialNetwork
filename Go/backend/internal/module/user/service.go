package user

import (
	"errors"
	"social-network/internal/pkg/jwt"

	"golang.org/x/crypto/bcrypt"
)

type UserService interface {
	Register(req RegisterRequest) (*UserResponse, error)
	Login(req LoginRequest) (*UserResponse, error)
	GetProfile(userID string) (*UserResponse, error)
	GetUserProfile(targetUserID string, currentUserID string) (*UserProfileResponse, error)
	SearchUsers(keyword string) ([]UserProfileResponse, error)
	UpdateProfile(userID string, req UpdateProfileRequest) (*UserResponse, error)
	// Lấy danh sách người follow / đang follow
	GetFollowers(userID string) ([]UserProfileResponse, error)
	GetFollowing(userID string) ([]UserProfileResponse, error)
	ToggleBlock(blockerID, blockedID string) (bool, error)
	GetBlockedUsers(userID string) ([]UserProfileResponse, error)
}

type userService struct{ repo UserRepository }

func NewUserService(repo UserRepository) UserService { return &userService{repo: repo} }

func (s *userService) Register(req RegisterRequest) (*UserResponse, error) {
	if _, err := s.repo.FindByEmail(req.Email); err == nil {
		return nil, errors.New("email đã được sử dụng")
	}
	if _, err := s.repo.FindByUsername(req.Username); err == nil {
		return nil, errors.New("username đã được sử dụng")
	}
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("lỗi mã hóa")
	}
	newUser := &User{Username: req.Username, Email: req.Email, PasswordHash: string(hashedPassword), FullName: req.FullName}
	if err := s.repo.CreateUser(newUser); err != nil {
		return nil, errors.New("không thể tạo tài khoản")
	}
	return &UserResponse{ID: newUser.ID, Username: newUser.Username, Email: newUser.Email, FullName: newUser.FullName}, nil
}

func (s *userService) Login(req LoginRequest) (*UserResponse, error) {
	user, err := s.repo.FindByEmail(req.Email)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)) != nil {
		return nil, errors.New("sai thông tin")
	}
	token, _ := jwt.GenerateToken(user.ID)
	return &UserResponse{ID: user.ID, Username: user.Username, Email: user.Email, FullName: user.FullName, AvatarURL: user.AvatarURL, FollowersCount: user.FollowersCount, FollowingCount: user.FollowingCount, Token: token}, nil
}

func (s *userService) GetProfile(userID string) (*UserResponse, error) {
	user, err := s.repo.FindByID(userID)
	if err != nil {
		return nil, errors.New("không tìm thấy người dùng")
	}
	return &UserResponse{ID: user.ID, Username: user.Username, Email: user.Email, FullName: user.FullName, AvatarURL: user.AvatarURL, FollowersCount: user.FollowersCount, FollowingCount: user.FollowingCount}, nil
}

func (s *userService) GetUserProfile(targetUserID string, currentUserID string) (*UserProfileResponse, error) {
	user, err := s.repo.FindByID(targetUserID)
	if err != nil {
		return nil, errors.New("người dùng không tồn tại")
	}
	isFollowing := s.repo.CheckIsFollowing(currentUserID, targetUserID)
	return &UserProfileResponse{ID: user.ID, Username: user.Username, FullName: user.FullName, AvatarURL: user.AvatarURL, Bio: user.Bio, FollowersCount: user.FollowersCount, FollowingCount: user.FollowingCount, IsFollowing: isFollowing}, nil
}

func (s *userService) SearchUsers(keyword string) ([]UserProfileResponse, error) {
	users, err := s.repo.SearchUsers(keyword)
	if err != nil {
		return nil, errors.New("lỗi tìm kiếm")
	}
	var result []UserProfileResponse
	for _, u := range users {
		result = append(result, UserProfileResponse{ID: u.ID, Username: u.Username, FullName: u.FullName, AvatarURL: u.AvatarURL})
	}
	return result, nil
}

// Xử lý cập nhật Profile
func (s *userService) UpdateProfile(userID string, req UpdateProfileRequest) (*UserResponse, error) {
	updates := map[string]interface{}{
		"full_name": req.FullName,
		"bio":       req.Bio,
	}
	if req.AvatarURL != nil {
		updates["avatar_url"] = *req.AvatarURL
	}

	if err := s.repo.UpdateProfile(userID, updates); err != nil {
		return nil, errors.New("lỗi cập nhật")
	}
	return s.GetProfile(userID)
}

// GetFollowers trả về danh sách người đang follow userID
func (s *userService) GetFollowers(userID string) ([]UserProfileResponse, error) {
	users, err := s.repo.GetFollowers(userID)
	if err != nil {
		return nil, errors.New("lỗi tải danh sách followers")
	}
	result := make([]UserProfileResponse, 0, len(users))
	for _, u := range users {
		result = append(result, UserProfileResponse{
			ID: u.ID, Username: u.Username, FullName: u.FullName, AvatarURL: u.AvatarURL,
		})
	}
	return result, nil
}

func (s *userService) ToggleBlock(blockerID, blockedID string) (bool, error) {
	if blockerID == blockedID {
		return false, errors.New("cannot block yourself")
	}
	return s.repo.ToggleBlock(blockerID, blockedID)
}

func (s *userService) GetBlockedUsers(userID string) ([]UserProfileResponse, error) {
	users, err := s.repo.GetBlockedUsers(userID)
	if err != nil {
		return nil, errors.New("error fetching blocked users")
	}
	result := make([]UserProfileResponse, 0, len(users))
	for _, u := range users {
		result = append(result, UserProfileResponse{
			ID: u.ID, Username: u.Username, FullName: u.FullName, AvatarURL: u.AvatarURL,
		})
	}
	return result, nil
}

// GetFollowing trả về danh sách người mà userID đang follow
func (s *userService) GetFollowing(userID string) ([]UserProfileResponse, error) {
	users, err := s.repo.GetFollowing(userID)
	if err != nil {
		return nil, errors.New("lỗi tải danh sách following")
	}
	result := make([]UserProfileResponse, 0, len(users))
	for _, u := range users {
		result = append(result, UserProfileResponse{
			ID: u.ID, Username: u.Username, FullName: u.FullName, AvatarURL: u.AvatarURL,
		})
	}
	return result, nil
}
