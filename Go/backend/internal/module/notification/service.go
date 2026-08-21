package notification

import "errors"

type NotificationService interface {
	GetMyNotifications(userID string) ([]NotificationResponse, error)
	MarkAsRead(notiID string, userID string) error
	MarkAllAsRead(userID string) error // Đánh dấu tất cả thông báo là đã đọc
}

type notificationService struct {
	repo NotificationRepository
}

func NewNotificationService(repo NotificationRepository) NotificationService {
	return &notificationService{repo: repo}
}

func (s *notificationService) GetMyNotifications(userID string) ([]NotificationResponse, error) {
	notis, err := s.repo.GetByUserID(userID)
	if err != nil {
		return nil, errors.New("không thể tải thông báo")
	}

	var result []NotificationResponse
	for _, n := range notis {
		result = append(result, NotificationResponse{
			ID:       n.ID,
			Type:     n.Type,
			EntityID: n.EntityID,
			IsRead:   n.IsRead,
			Actor: ActorInfo{
				ID:        n.Actor.ID,
				FullName:  n.Actor.FullName,
				AvatarURL: n.Actor.AvatarURL,
			},
			CreatedAt: n.CreatedAt,
		})
	}
	return result, nil
}

func (s *notificationService) MarkAsRead(notiID string, userID string) error {
	if err := s.repo.MarkAsRead(notiID, userID); err != nil {
		return errors.New("không thể cập nhật thông báo")
	}
	return nil
}

func (s *notificationService) MarkAllAsRead(userID string) error {
	if err := s.repo.MarkAllAsRead(userID); err != nil {
		return errors.New("không thể cập nhật thông báo")
	}
	return nil
}