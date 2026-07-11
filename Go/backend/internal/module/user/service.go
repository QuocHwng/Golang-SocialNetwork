package user

import (
	"errors"
	"social-network/internal/pkg/jwt"

	"golang.org/x/crypto/bcrypt"
)

// Interface định nghĩa các nghiệp vụ
type UserService interface {
	Register(req RegisterRequest) (*UserResponse, error)
	Login(req LoginRequest) (*UserResponse, error)

	GetProfile(userID string) (*UserResponse, error)
}

type userService struct {
	repo UserRepository
}

func NewUserService(repo UserRepository) UserService {
	return &userService{repo: repo}
}

// 1. Nghiệp vụ Đăng ký
func (s *userService) Register(req RegisterRequest) (*UserResponse, error) {
	// Kiểm tra Email hoặc Username đã tồn tại chưa
	if _, err := s.repo.FindByEmail(req.Email); err == nil {
		return nil, errors.New("email đã được sử dụng")
	}
	if _, err := s.repo.FindByUsername(req.Username); err == nil {
		return nil, errors.New("username đã được sử dụng")
	}

	// Mã hóa (Hash) mật khẩu bằng Bcrypt
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, errors.New("lỗi mã hóa mật khẩu")
	}

	// Tạo dữ liệu User mới để lưu vào DB
	newUser := &User{
		Username:     req.Username,
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		FullName:     req.FullName,
	}

	if err := s.repo.CreateUser(newUser); err != nil {
		return nil, errors.New("không thể tạo tài khoản lúc này")
	}

	// Trả về dữ liệu (không bao gồm password)
	return &UserResponse{
		ID:       newUser.ID,
		Username: newUser.Username,
		Email:    newUser.Email,
		FullName: newUser.FullName,
	}, nil
}

// 2. Nghiệp vụ Đăng nhập
func (s *userService) Login(req LoginRequest) (*UserResponse, error) {
	// Tìm user bằng email
	user, err := s.repo.FindByEmail(req.Email)
	if err != nil {
		return nil, errors.New("email hoặc mật khẩu không đúng")
	}

	// So sánh mật khẩu người dùng nhập với mật khẩu đã hash trong DB
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, errors.New("email hoặc mật khẩu không đúng")
	}

	// Mật khẩu đúng -> Tạo Token JWT
	token, err := jwt.GenerateToken(user.ID)
	if err != nil {
		return nil, errors.New("lỗi hệ thống khi tạo token")
	}

	// Trả về thông tin kèm thẻ Token
	return &UserResponse{
		ID:             user.ID,
		Username:       user.Username,
		Email:          user.Email,
		FullName:       user.FullName,
		AvatarURL:      user.AvatarURL,
		FollowersCount: user.FollowersCount,
		FollowingCount: user.FollowingCount,
		Token:          token, // Token trả về đây
	}, nil
}

// 3. Nghiệp vụ thông tin cá nhân
func (s *userService) GetProfile(userID string) (*UserResponse, error) {
	user, err := s.repo.FindByID(userID)
	if err != nil {
		return nil, errors.New("không tìm thấy người dùng")
	}

	return &UserResponse{
		ID:             user.ID,
		Username:       user.Username,
		Email:          user.Email,
		FullName:       user.FullName,
		AvatarURL:      user.AvatarURL,
		FollowersCount: user.FollowersCount,
		FollowingCount: user.FollowingCount,
	}, nil
}
