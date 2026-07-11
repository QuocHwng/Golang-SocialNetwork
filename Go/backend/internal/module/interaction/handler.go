package interaction

import (
	"net/http"
	"social-network/internal/pkg/response"

	"github.com/gin-gonic/gin"
)

type InteractionHandler struct {
	service InteractionService
}

func NewInteractionHandler(service InteractionService) *InteractionHandler {
	return &InteractionHandler{service: service}
}

// 1. Thích / Bỏ thích bài viết
func (h *InteractionHandler) ToggleLike(c *gin.Context) {
	userID, _ := c.Get("user_id")
	postID := c.Param("id")

	res, err := h.service.ToggleLike(postID, userID.(string))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	msg := "Đã thích bài viết"
	if !res.IsLiked {
		msg = "Đã bỏ thích bài viết"
	}
	response.Success(c, http.StatusOK, msg, res)
}

// 2. Tạo bình luận mới
func (h *InteractionHandler) CreateComment(c *gin.Context) {
	userID, _ := c.Get("user_id")
	postID := c.Param("id")

	var req CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Nội dung bình luận không được để trống")
		return
	}

	res, err := h.service.CreateComment(postID, userID.(string), req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, "Đã gửi bình luận", res)
}

// 3. Lấy danh sách bình luận
func (h *InteractionHandler) GetComments(c *gin.Context) {
	postID := c.Param("id")

	res, err := h.service.GetComments(postID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "Tải bình luận thành công", res)
}

// 4. Theo dõi / Bỏ theo dõi người dùng
func (h *InteractionHandler) ToggleFollow(c *gin.Context) {
	followerID, _ := c.Get("user_id")

	followingID := c.Param("id")
	if followingID == "" {
		response.Error(c, http.StatusBadRequest, "ID người dùng không hợp lệ")
		return
	}

	res, err := h.service.ToggleFollow(followerID.(string), followingID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	msg := "Đã theo dõi người dùng"
	if !res.IsFollowing {
		msg = "Đã bỏ theo dõi người dùng"
	}

	response.Success(c, http.StatusOK, msg, res)
}
