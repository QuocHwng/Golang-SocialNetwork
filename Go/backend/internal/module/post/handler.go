package post

import (
	"net/http"
	"social-network/internal/pkg/response"

	"strconv"

	"github.com/gin-gonic/gin"
)

type PostHandler struct {
	service PostService
}

func NewPostHandler(service PostService) *PostHandler {
	return &PostHandler{service: service}
}

// CreatePost tiếp nhận request đăng bài
func (h *PostHandler) CreatePost(c *gin.Context) {
	// 1. Lấy ID của người dùng từ chốt chặn Middleware
	userID, exists := c.Get("user_id")
	if !exists {
		response.Error(c, http.StatusUnauthorized, "Không thể xác thực danh tính")
		return
	}

	// 2. Lấy nội dung bài viết từ ReactJS gửi lên
	var req CreatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Nội dung bài viết không hợp lệ")
		return
	}

	// 3. Đưa cho Service xử lý
	res, err := h.service.CreatePost(userID.(string), req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	// 4. Trả về kết quả
	response.Success(c, http.StatusCreated, "Đăng bài thành công", res)
}

func (h *PostHandler) GetNewsFeed(c *gin.Context) {
	// Lấy tham số phân trang từ URL (mặc định page=1, limit=10)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	res, err := h.service.GetNewsFeed(limit, page)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Tải bảng tin thành công", res)
}

// Lấy chi tiết 1 bài viết (GET /posts/:id)
func (h *PostHandler) GetPostByID(c *gin.Context) {
	postID := c.Param("id")
	res, err := h.service.GetPostByID(postID)
	if err != nil {
		response.Error(c, http.StatusNotFound, err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Thành công", res)
}
