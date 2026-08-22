import re

with open('Go/backend/internal/module/chat/repo.go', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('IsRecalled bool      `gorm:\"default:false\"` // true = tin nh?n dã b? thu h?i (soft delete)', 
'IsRecalled bool      `gorm:\"default:false\"` // true = tin nh?n dã b? thu h?i (soft delete)\n\tIsRead     bool      `gorm:\"default:false\"` // Ðánh d?u dã d?c')

content = content.replace('type ContactUser struct {\n\tID        string `gorm:\"primaryKey\"`\n\tFullName  string\n\tAvatarURL string\n}',
'type ContactUser struct {\n\tID          string `gorm:\"primaryKey\"`\n\tFullName    string\n\tAvatarURL   string\n\tUnreadCount int    `gorm:\"-\"`\n}')

content = content.replace('RecallMessage(msgID, senderID string) error // Soft-delete: dánh d?u thu h?i, không xóa DB',
'RecallMessage(msgID, senderID string) error // Soft-delete: dánh d?u thu h?i, không xóa DB\n\tMarkMessagesAsRead(senderID, receiverID string) error\n\tGetUnreadCountPerContact(userID string) (map[string]int, error)')

content += '''
func (r *chatRepo) MarkMessagesAsRead(senderID, receiverID string) error {
	return r.db.Model(&Message{}).
		Where("sender_id = ? AND receiver_id = ? AND is_read = ?", senderID, receiverID, false).
		Update("is_read", true).Error
}

func (r *chatRepo) GetUnreadCountPerContact(userID string) (map[string]int, error) {
	var counts []struct {
		SenderID string
		Count    int
	}
	err := r.db.Model(&Message{}).Select("sender_id, count(*) as count").
		Where("receiver_id = ? AND is_read = ?", userID, false).
		Group("sender_id").Scan(&counts).Error
	if err != nil {
		return nil, err
	}
	res := make(map[string]int)
	for _, c := range counts {
		res[c.SenderID] = c.Count
	}
	return res, nil
}
'''

with open('Go/backend/internal/module/chat/repo.go', 'w', encoding='utf-8') as f:
    f.write(content)
