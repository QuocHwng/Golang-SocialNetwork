package user

import (
	"net/http"
	"social-network/internal/pkg/response"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	service UserService
}

func NewUserHandler(service UserService) *UserHandler {
	return &UserHandler{service: service}
}

// Đăng ký tài khoản (POST /register)
func (h *UserHandler) Register(c *gin.Context) {
	var req RegisterRequest

	// Ép kiểu JSON từ Frontend thành DTO của Go (bắt lỗi nếu Frontend gửi sai field)
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Dữ liệu không hợp lệ: "+err.Error())
		return
	}

	// Đưa cho Service xử lý
	res, err := h.service.Register(req)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	// Trả về kết quả thành công
	response.Success(c, http.StatusCreated, "Đăng ký thành công", res)
}

// Đăng nhập (POST /login)
func (h *UserHandler) Login(c *gin.Context) {
	var req LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Dữ liệu không hợp lệ")
		return
	}

	res, err := h.service.Login(req)
	if err != nil {
		response.Error(c, http.StatusUnauthorized, err.Error()) // Lỗi 401: Không có quyền
		return
	}

	response.Success(c, http.StatusOK, "Đăng nhập thành công", res)
}

// Xem thông tin cá nhân (Yêu cầu phải có Token)
func (h *UserHandler) GetProfile(c *gin.Context) {
	userID, _ := c.Get("user_id") // Đã được Middleware kiểm tra nên chắc chắn có

	// Gọi service lấy data thật
	res, err := h.service.GetProfile(userID.(string))
	if err != nil {
		response.Error(c, http.StatusNotFound, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Lấy thông tin profile thành công", res)
}

// Xem trang cá nhân của ai đó (GET /users/:id)
func (h *UserHandler) GetUserProfile(c *gin.Context) {
	currentUserID, _ := c.Get("user_id")
	targetUserID := c.Param("id")

	res, err := h.service.GetUserProfile(targetUserID, currentUserID.(string))
	if err != nil {
		response.Error(c, http.StatusNotFound, err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Thành công", res)
}

// Tìm kiếm người dùng (GET /users/search?q=...)
func (h *UserHandler) SearchUsers(c *gin.Context) {
	keyword := c.Query("q")
	if keyword == "" {
		response.Success(c, http.StatusOK, "Thành công", []UserProfileResponse{})
		return
	}

	res, err := h.service.SearchUsers(keyword)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Thành công", res)
}

// Sửa thông tin cá nhân (PUT /profile)
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Dữ liệu không hợp lệ")
		return
	}
	res, err := h.service.UpdateProfile(userID.(string), req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Cập nhật thành công", res)
}

// Xem danh sách Followers của một user (GET /users/:id/followers)
func (h *UserHandler) GetFollowers(c *gin.Context) {
	targetUserID := c.Param("id")
	res, err := h.service.GetFollowers(targetUserID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Thành công", res)
}

// Xem danh sách Following của một user (GET /users/:id/following)
func (h *UserHandler) GetFollowing(c *gin.Context) {
	targetUserID := c.Param("id")
	res, err := h.service.GetFollowing(targetUserID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Thành công", res)
}

func (h *UserHandler) ToggleBlock(c *gin.Context) {
	blockerID, _ := c.Get("user_id")
	blockedID := c.Param("id")

	isBlocked, err := h.service.ToggleBlock(blockerID.(string), blockedID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	
	msg := "Đã chặn người dùng"
	if !isBlocked {
		msg = "Đã bỏ chặn người dùng"
	}
	response.Success(c, http.StatusOK, msg, gin.H{"is_blocked": isBlocked})
}

func (h *UserHandler) GetBlockedUsers(c *gin.Context) {
	userID, _ := c.Get("user_id")
	res, err := h.service.GetBlockedUsers(userID.(string))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Danh sách người bị chặn", res)
}
