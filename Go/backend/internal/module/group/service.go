package group

import (
	"errors"
	"social-network/internal/module/notification"
)

type GroupService interface {
	CreateGroup(userID string, req CreateGroupReq) (*GroupRes, error)
	ToggleJoinGroup(groupID, userID string) (string, error)
	GetGroupDetail(groupID, userID string) (*GroupRes, error)
	GetAllGroups(userID string) ([]GroupRes, error)
	GetPendingRequests(groupID, userID string) ([]RequestUserInfo, error)
	HandleRequest(groupID, adminID, targetUserID, action string) error
	GetGroupMembers(groupID, userID string) ([]GroupMemberInfo, error)
	RemoveMember(groupID, adminID, targetUserID string) error
}

type groupService struct{ repo GroupRepository }

func NewGroupService(repo GroupRepository) GroupService { return &groupService{repo: repo} }

func (s *groupService) CreateGroup(userID string, req CreateGroupReq) (*GroupRes, error) {
	g := &Group{Name: req.Name, Description: req.Description, CoverURL: req.CoverURL, CreatorID: userID}
	if err := s.repo.CreateGroup(g); err != nil {
		return nil, errors.New("lỗi tạo nhóm")
	}
	_ = s.repo.JoinGroup(g.ID, userID, "admin", "approved") // Tự tham gia, tự duyệt
	return &GroupRes{ID: g.ID, Name: g.Name, Description: g.Description, CoverURL: g.CoverURL, MembersCount: 1, CreatorID: g.CreatorID, JoinStatus: "approved"}, nil
}

func (s *groupService) ToggleJoinGroup(groupID, userID string) (string, error) {
	_, err := s.repo.GetMemberInfo(groupID, userID)

	if err == nil {
		if err := s.repo.LeaveGroup(groupID, userID); err != nil {
			return "", errors.New("lỗi rời nhóm")
		}
		return "none", nil
	}

	if err := s.repo.JoinGroup(groupID, userID, "member", "pending"); err != nil {
		return "", errors.New("lỗi tham gia nhóm")
	}

	g, _ := s.repo.GetGroupByID(groupID)
	if g != nil {
		notification.SharedHub.SendToUser(g.CreatorID, map[string]interface{}{
			"event": "NEW_NOTIFICATION", "message": "Có người xin vào nhóm của bạn!",
		})
	}
	return "pending", nil
}

func (s *groupService) GetGroupDetail(groupID, userID string) (*GroupRes, error) {
	g, err := s.repo.GetGroupByID(groupID)
	if err != nil {
		return nil, errors.New("nhóm không tồn tại")
	}

	status := "none"
	gm, err := s.repo.GetMemberInfo(groupID, userID)
	if err == nil {
		status = gm.Status
	}

	return &GroupRes{ID: g.ID, Name: g.Name, Description: g.Description, CoverURL: g.CoverURL, MembersCount: g.MembersCount, CreatorID: g.CreatorID, JoinStatus: status}, nil
}

func (s *groupService) GetAllGroups(userID string) ([]GroupRes, error) {
	groups, err := s.repo.GetAllGroups()
	if err != nil {
		return nil, errors.New("lỗi tải nhóm")
	}
	var res []GroupRes
	for _, g := range groups {
		status := "none"
		gm, err := s.repo.GetMemberInfo(g.ID, userID)
		if err == nil {
			status = gm.Status
		}
		res = append(res, GroupRes{ID: g.ID, Name: g.Name, Description: g.Description, CoverURL: g.CoverURL, MembersCount: g.MembersCount, CreatorID: g.CreatorID, JoinStatus: status})
	}
	return res, nil
}

func (s *groupService) GetPendingRequests(groupID, userID string) ([]RequestUserInfo, error) {
	g, _ := s.repo.GetGroupByID(groupID)
	if g == nil || g.CreatorID != userID {
		return nil, errors.New("bạn không có quyền xem")
	}
	return s.repo.GetPendingRequests(groupID)
}

func (s *groupService) HandleRequest(groupID, adminID, targetUserID, action string) error {
	g, _ := s.repo.GetGroupByID(groupID)
	if g == nil || g.CreatorID != adminID {
		return errors.New("bạn không phải admin")
	}

	if action == "approve" {
		return s.repo.ApproveRequest(groupID, targetUserID)
	}
	return s.repo.RejectRequest(groupID, targetUserID)
}

// ĐÃ FIX: Đặc cách cho người tạo nhóm luôn được xem danh sách
func (s *groupService) GetGroupMembers(groupID, userID string) ([]GroupMemberInfo, error) {
	g, _ := s.repo.GetGroupByID(groupID)
	isCreator := (g != nil && g.CreatorID == userID)

	gm, err := s.repo.GetMemberInfo(groupID, userID)
	isApprovedMember := (err == nil && gm.Status == "approved")

	if !isCreator && !isApprovedMember {
		return nil, errors.New("bạn phải là thành viên để xem danh sách này")
	}
	return s.repo.GetGroupMembers(groupID)
}

func (s *groupService) RemoveMember(groupID, adminID, targetUserID string) error {
	g, _ := s.repo.GetGroupByID(groupID)
	if g == nil || g.CreatorID != adminID {
		return errors.New("bạn không có quyền kick thành viên")
	}
	if adminID == targetUserID {
		return errors.New("bạn không thể tự kick chính mình")
	}

	if err := s.repo.RemoveMember(groupID, targetUserID); err != nil {
		return errors.New("lỗi xóa thành viên")
	}
	return nil
}
