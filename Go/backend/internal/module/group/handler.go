package group

import (
	"net/http"
	"social-network/internal/pkg/response"

	"github.com/gin-gonic/gin"
)

type GroupHandler struct{ service GroupService }

func NewGroupHandler(service GroupService) *GroupHandler { return &GroupHandler{service: service} }

func (h *GroupHandler) CreateGroup(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var req CreateGroupReq
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "Dữ liệu không hợp lệ")
		return
	}
	res, err := h.service.CreateGroup(userID.(string), req)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(c, http.StatusCreated, "Đã tạo nhóm", res)
}

func (h *GroupHandler) ToggleJoinGroup(c *gin.Context) {
	userID, _ := c.Get("user_id")
	groupID := c.Param("id")
	status, err := h.service.ToggleJoinGroup(groupID, userID.(string))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Thành công", gin.H{"join_status": status})
}

func (h *GroupHandler) GetGroupDetail(c *gin.Context) {
	userID, _ := c.Get("user_id")
	groupID := c.Param("id")
	res, err := h.service.GetGroupDetail(groupID, userID.(string))
	if err != nil {
		response.Error(c, http.StatusNotFound, err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Thành công", res)
}

func (h *GroupHandler) GetAllGroups(c *gin.Context) {
	userID, _ := c.Get("user_id")
	res, err := h.service.GetAllGroups(userID.(string))
	if err != nil {
		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Thành công", res)
}

// MỚI: GET /groups/:id/requests
func (h *GroupHandler) GetPendingRequests(c *gin.Context) {
	userID, _ := c.Get("user_id")
	groupID := c.Param("id")
	res, err := h.service.GetPendingRequests(groupID, userID.(string))
	if err != nil {
		response.Error(c, http.StatusForbidden, err.Error())
		return
	}
	if res == nil {
		res = []RequestUserInfo{}
	}
	response.Success(c, http.StatusOK, "Thành công", res)
}

// MỚI: POST /groups/:id/requests/:userId?action=approve (hoặc reject)
func (h *GroupHandler) HandleRequest(c *gin.Context) {
	adminID, _ := c.Get("user_id")
	groupID := c.Param("id")
	targetUserID := c.Param("userId")
	action := c.Query("action") // approve hoặc reject

	if err := h.service.HandleRequest(groupID, adminID.(string), targetUserID, action); err != nil {
		response.Error(c, http.StatusForbidden, err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Đã xử lý", nil)
}

// GET /groups/:id/members
func (h *GroupHandler) GetGroupMembers(c *gin.Context) {
	userID, _ := c.Get("user_id")
	groupID := c.Param("id")
	res, err := h.service.GetGroupMembers(groupID, userID.(string))
	if err != nil {
		response.Error(c, http.StatusForbidden, err.Error())
		return
	}
	if res == nil {
		res = []GroupMemberInfo{}
	}
	response.Success(c, http.StatusOK, "Thành công", res)
}

// DELETE /groups/:id/members/:userId
func (h *GroupHandler) RemoveMember(c *gin.Context) {
	adminID, _ := c.Get("user_id")
	groupID := c.Param("id")
	targetUserID := c.Param("userId")

	if err := h.service.RemoveMember(groupID, adminID.(string), targetUserID); err != nil {
		response.Error(c, http.StatusForbidden, err.Error())
		return
	}
	response.Success(c, http.StatusOK, "Đã xóa thành viên", nil)
}
