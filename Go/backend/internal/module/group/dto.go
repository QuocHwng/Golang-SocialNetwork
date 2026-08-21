package group

import "time"

type CreateGroupReq struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	CoverURL    string `json:"cover_url"`
}

// ĐÃ CHUẨN HÓA DTO
type GroupRes struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	CoverURL     string    `json:"cover_url"`
	MembersCount int       `json:"members_count"`
	CreatorID    string    `json:"creator_id"`
	JoinStatus   string    `json:"join_status"` // 'none', 'pending', 'approved'
	CreatedAt    time.Time `json:"created_at"`
}
