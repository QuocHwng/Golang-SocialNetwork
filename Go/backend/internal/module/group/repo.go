package group

import (
	"time"

	"gorm.io/gorm"
)

type Group struct {
	ID           string `gorm:"type:uuid;default:gen_random_uuid();primaryKey"`
	Name         string `gorm:"not null"`
	Description  string
	CoverURL     string
	CreatorID    string `gorm:"type:uuid;not null"`
	MembersCount int    `gorm:"default:0"` // FIX: default 0, vì khi tạo group creator sẽ gọi JoinGroup(+1)
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type GroupMember struct {
	GroupID   string `gorm:"type:uuid;primaryKey"`
	UserID    string `gorm:"type:uuid;primaryKey"`
	Role      string `gorm:"default:'member'"`
	Status    string `gorm:"default:'pending'"`
	CreatedAt time.Time
}

type RequestUserInfo struct {
	UserID    string `json:"user_id"`
	FullName  string `json:"full_name"`
	AvatarURL string `json:"avatar_url"`
}

type GroupMemberInfo struct {
	UserID    string `json:"user_id"`
	FullName  string `json:"full_name"`
	AvatarURL string `json:"avatar_url"`
	Role      string `json:"role"`
}

type GroupRepository interface {
	CreateGroup(g *Group) error
	JoinGroup(groupID, userID, role, status string) error
	LeaveGroup(groupID, userID string) error
	GetGroupByID(groupID string) (*Group, error)
	GetMemberInfo(groupID, userID string) (*GroupMember, error)
	GetAllGroups() ([]Group, error)
	GetPendingRequests(groupID string) ([]RequestUserInfo, error)
	ApproveRequest(groupID, userID string) error
	RejectRequest(groupID, userID string) error
	GetGroupMembers(groupID string) ([]GroupMemberInfo, error)
	RemoveMember(groupID, targetUserID string) error
}

type groupRepo struct{ db *gorm.DB }

func NewGroupRepository(db *gorm.DB) GroupRepository {
	db.AutoMigrate(&Group{}, &GroupMember{})
	return &groupRepo{db: db}
}

func (r *groupRepo) CreateGroup(g *Group) error { return r.db.Create(g).Error }

// ĐÃ NÂNG CẤP: Chống chèn đúp thành viên
func (r *groupRepo) JoinGroup(groupID, userID, role, status string) error {
	var count int64
	r.db.Model(&GroupMember{}).Where("group_id = ? AND user_id = ?", groupID, userID).Count(&count)
	if count > 0 {
		return nil
	} // Có rồi thì thôi, không chèn nữa

	err := r.db.Create(&GroupMember{GroupID: groupID, UserID: userID, Role: role, Status: status}).Error
	if err == nil && status == "approved" {
		r.db.Model(&Group{}).Where("id = ?", groupID).UpdateColumn("members_count", gorm.Expr("members_count + 1"))
	}
	return err
}

// ĐÃ NÂNG CẤP: Xóa sạch các dòng rác nếu có
func (r *groupRepo) LeaveGroup(groupID, userID string) error {
	var gm GroupMember
	if err := r.db.Where("group_id = ? AND user_id = ?", groupID, userID).First(&gm).Error; err != nil {
		return err
	}

	// Xóa tất cả các dòng trùng lặp (nếu bị lỗi trước đó)
	err := r.db.Where("group_id = ? AND user_id = ?", groupID, userID).Delete(&GroupMember{}).Error

	if err == nil && gm.Status == "approved" {
		r.db.Model(&Group{}).Where("id = ?", groupID).UpdateColumn("members_count", gorm.Expr("members_count - 1"))
	}
	return err
}

func (r *groupRepo) GetGroupByID(groupID string) (*Group, error) {
	var g Group
	err := r.db.Where("id = ?", groupID).First(&g).Error
	return &g, err
}
func (r *groupRepo) GetMemberInfo(groupID, userID string) (*GroupMember, error) {
	var gm GroupMember
	err := r.db.Where("group_id = ? AND user_id = ?", groupID, userID).First(&gm).Error
	return &gm, err
}
func (r *groupRepo) GetAllGroups() ([]Group, error) {
	var groups []Group
	err := r.db.Order("created_at desc").Find(&groups).Error
	return groups, err
}

// ĐÃ NÂNG CẤP: Dùng DISTINCT chống hiển thị đúp
func (r *groupRepo) GetPendingRequests(groupID string) ([]RequestUserInfo, error) {
	var results []RequestUserInfo
	err := r.db.Table("group_members").Select("DISTINCT users.id as user_id, users.full_name, users.avatar_url").
		Joins("JOIN users ON users.id = group_members.user_id").
		Where("group_members.group_id = ? AND group_members.status = 'pending'", groupID).Scan(&results).Error
	return results, err
}

func (r *groupRepo) ApproveRequest(groupID, userID string) error {
	err := r.db.Model(&GroupMember{}).Where("group_id = ? AND user_id = ?", groupID, userID).Update("status", "approved").Error
	if err == nil {
		r.db.Model(&Group{}).Where("id = ?", groupID).UpdateColumn("members_count", gorm.Expr("members_count + 1"))
	}
	return err
}

func (r *groupRepo) RejectRequest(groupID, userID string) error {
	return r.db.Where("group_id = ? AND user_id = ? AND status = 'pending'", groupID, userID).Delete(&GroupMember{}).Error
}

// ĐÃ NÂNG CẤP: Dùng DISTINCT chống hiển thị đúp
func (r *groupRepo) GetGroupMembers(groupID string) ([]GroupMemberInfo, error) {
	var results []GroupMemberInfo
	err := r.db.Table("group_members").Select("DISTINCT users.id as user_id, users.full_name, users.avatar_url, group_members.role").
		Joins("JOIN users ON users.id = group_members.user_id").
		Where("group_members.group_id = ? AND group_members.status = 'approved'", groupID).Scan(&results).Error
	return results, err
}

func (r *groupRepo) RemoveMember(groupID, targetUserID string) error {
	return r.LeaveGroup(groupID, targetUserID)
}
