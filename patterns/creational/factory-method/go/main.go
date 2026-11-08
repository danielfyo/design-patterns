// Factory Method pattern: a notification service whose concrete creators
// decide which notifier (product) to create.
//
// Go has no inheritance, so the "abstract creator" is a struct that holds the
// business logic and receives the factory method as a function field. Each
// concrete creator is a constructor that plugs in its own factory method.
//
// Run with: go run ./patterns/creational/factory-method/go
package main

import (
	"errors"
	"fmt"
	"strings"
)

// User is the person we want to reach. Each channel uses a different address.
type User struct {
	Name, Email, Phone, DeviceID string
}

// Notifier is the Product: the common interface of everything the factory
// method can create.
type Notifier interface {
	Send(recipient User, message string) string
}

// EmailNotifier is a Concrete Product: delivers the message by e-mail.
type EmailNotifier struct{}

func (EmailNotifier) Send(r User, message string) string {
	return fmt.Sprintf("EMAIL to %s: %q", r.Email, message)
}

// SmsNotifier is a Concrete Product: delivers the message by SMS, which has a
// length limit.
type SmsNotifier struct{}

// SmsMaxLength is the maximum length of an SMS text.
const SmsMaxLength = 32

func (SmsNotifier) Send(r User, message string) string {
	text := message
	if len(text) > SmsMaxLength {
		text = text[:SmsMaxLength-3] + "..."
	}
	return fmt.Sprintf("SMS to %s: %q", r.Phone, text)
}

// PushNotifier is a Concrete Product: delivers a mobile push notification.
type PushNotifier struct{}

func (PushNotifier) Send(r User, message string) string {
	return fmt.Sprintf("PUSH to %s: %q", r.DeviceID, message)
}

// NotificationService is the Creator. CreateNotifier is the factory method;
// Notify is the business logic that works with whatever product it returns.
type NotificationService struct {
	Name           string
	CreateNotifier func() Notifier
}

// Notify validates, personalizes and delivers. It never names a concrete notifier.
func (s *NotificationService) Notify(user User, message string) (string, error) {
	if strings.TrimSpace(message) == "" {
		return "", errors.New("message must not be empty")
	}
	notifier := s.CreateNotifier()
	return notifier.Send(user, "Hi "+user.Name+", "+message), nil
}

// NewEmailService is a Concrete Creator: its factory method returns an EmailNotifier.
func NewEmailService() *NotificationService {
	return &NotificationService{Name: "EmailService", CreateNotifier: func() Notifier { return EmailNotifier{} }}
}

// NewSmsService is a Concrete Creator: its factory method returns an SmsNotifier.
func NewSmsService() *NotificationService {
	return &NotificationService{Name: "SmsService", CreateNotifier: func() Notifier { return SmsNotifier{} }}
}

// NewPushService is a Concrete Creator: its factory method returns a PushNotifier.
func NewPushService() *NotificationService {
	return &NotificationService{Name: "PushService", CreateNotifier: func() Notifier { return PushNotifier{} }}
}

// ServiceFromConfig is NOT the GoF pattern: it is a "simple factory" that maps a
// configuration string to a concrete creator.
func ServiceFromConfig(channel string) (*NotificationService, error) {
	switch channel {
	case "email":
		return NewEmailService(), nil
	case "sms":
		return NewSmsService(), nil
	case "push":
		return NewPushService(), nil
	}
	return nil, fmt.Errorf("unknown notification channel %q", channel)
}

// sendShippingUpdate is client code: it only knows the creator's contract.
func sendShippingUpdate(service *NotificationService, user User) {
	receipt, err := service.Notify(user, "your order #1001 has shipped.")
	if err != nil {
		receipt = "error: " + err.Error()
	}
	fmt.Printf("  %-12s -> %s\n", service.Name, receipt)
}

func main() {
	fmt.Println("=== Factory Method Pattern: Notification service ===")

	alice := User{Name: "Alice", Email: "alice@example.com", Phone: "+1-555-0100", DeviceID: "device-a1b2"}
	bob := User{Name: "Bob", Email: "bob@example.com", Phone: "+1-555-0199", DeviceID: "device-c3d4"}

	fmt.Println("Client code works only with the abstract NotificationService:")
	for _, service := range []*NotificationService{NewEmailService(), NewSmsService(), NewPushService()} {
		sendShippingUpdate(service, alice)
	}

	fmt.Println("Config-driven selection (a simple factory picks the creator):")
	for _, channel := range []string{"push", "email", "fax"} {
		service, err := ServiceFromConfig(channel)
		if err != nil {
			fmt.Printf("  channel=%-6s -> error: %v\n", channel, err)
			continue
		}
		fmt.Printf("  channel=%-6s -> %s\n", channel, service.Name)
		receipt, _ := service.Notify(bob, "your password was changed.")
		fmt.Printf("    %s\n", receipt)
	}

	fmt.Println("Shared business rules live in the creator:")
	sms := NewSmsService()
	if _, err := sms.Notify(alice, "   "); err != nil {
		fmt.Printf("  %-12s -> error: %v\n", sms.Name, err)
	}
}
