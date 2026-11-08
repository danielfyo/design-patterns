package main

import (
	"bytes"
	"io"
	"os"
	"strings"
	"testing"
)

var alice = User{Name: "Alice", Email: "alice@example.com", Phone: "+1-555-0100", DeviceID: "device-a1b2"}

func TestEachConcreteCreatorDeliversThroughItsOwnProduct(t *testing.T) {
	tests := []struct {
		service *NotificationService
		want    string
	}{
		{NewEmailService(), `EMAIL to alice@example.com: "Hi Alice, your order shipped."`},
		{NewSmsService(), `SMS to +1-555-0100: "Hi Alice, your order shipped."`},
		{NewPushService(), `PUSH to device-a1b2: "Hi Alice, your order shipped."`},
	}
	for _, tt := range tests {
		t.Run(tt.service.Name, func(t *testing.T) {
			got, err := tt.service.Notify(alice, "your order shipped.")
			if err != nil {
				t.Fatal(err)
			}
			if got != tt.want {
				t.Errorf("Notify() = %s, want %s", got, tt.want)
			}
		})
	}
}

func TestSmsProductTruncatesLongMessagesToTheMaximumLength(t *testing.T) {
	got := SmsNotifier{}.Send(alice, strings.Repeat("a", 40))

	want := `SMS to +1-555-0100: "` + strings.Repeat("a", SmsMaxLength-3) + `..."`
	if got != want {
		t.Errorf("Send() = %s, want %s", got, want)
	}
}

func TestSmsProductKeepsAMessageThatFitsExactly(t *testing.T) {
	message := strings.Repeat("b", SmsMaxLength)

	if got, want := (SmsNotifier{}).Send(alice, message), `SMS to +1-555-0100: "`+message+`"`; got != want {
		t.Errorf("Send() = %s, want %s", got, want)
	}
}

func TestCreatorRejectsABlankMessageForEveryChannel(t *testing.T) {
	for _, service := range []*NotificationService{NewEmailService(), NewSmsService(), NewPushService()} {
		for _, message := range []string{"", "   "} {
			_, err := service.Notify(alice, message)
			if err == nil || err.Error() != "message must not be empty" {
				t.Errorf("%s.Notify(%q) error = %v", service.Name, message, err)
			}
		}
	}
}

type fakeNotifier struct{}

func (fakeNotifier) Send(r User, message string) string { return "FAKE " + r.Name + ": " + message }

func newRecordingService(created *int) *NotificationService {
	return &NotificationService{Name: "RecordingService", CreateNotifier: func() Notifier {
		*created++
		return fakeNotifier{}
	}}
}

func TestSharedBusinessLogicWorksWithAnyProductACreatorPlugsIn(t *testing.T) {
	created := 0
	service := newRecordingService(&created)

	got, err := service.Notify(alice, "hello")

	if err != nil || got != "FAKE Alice: Hi Alice, hello" {
		t.Errorf("Notify() = %q, %v", got, err)
	}
	if created != 1 {
		t.Errorf("factory method called %d times, want 1", created)
	}
}

func TestFactoryMethodIsNotCalledWhenValidationFails(t *testing.T) {
	created := 0
	service := newRecordingService(&created)

	if _, err := service.Notify(alice, " "); err == nil {
		t.Fatal("expected an error")
	}
	if created != 0 {
		t.Errorf("factory method called %d times, want 0", created)
	}
}

func TestSimpleFactoryMapsAChannelNameToItsCreator(t *testing.T) {
	tests := map[string]string{"email": "EmailService", "sms": "SmsService", "push": "PushService"}
	for channel, want := range tests {
		service, err := ServiceFromConfig(channel)
		if err != nil {
			t.Fatalf("%s: %v", channel, err)
		}
		if service.Name != want {
			t.Errorf("ServiceFromConfig(%q).Name = %s, want %s", channel, service.Name, want)
		}
	}
}

func TestSimpleFactoryRejectsUnknownChannels(t *testing.T) {
	for _, channel := range []string{"fax", "Email"} {
		service, err := ServiceFromConfig(channel)
		if service != nil || err == nil || err.Error() != `unknown notification channel "`+channel+`"` {
			t.Errorf("ServiceFromConfig(%q) = %v, %v", channel, service, err)
		}
	}
}

func TestDemoPrintsTheExpectedOutput(t *testing.T) {
	want, err := os.ReadFile("../expected_output.txt")
	if err != nil {
		t.Fatal(err)
	}
	if got := captureStdout(t, main); got != string(want) {
		t.Errorf("output mismatch:\n--- got ---\n%s\n--- want ---\n%s", got, want)
	}
}

// captureStdout runs fn and returns everything it printed to os.Stdout.
func captureStdout(t *testing.T, fn func()) string {
	t.Helper()
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatal(err)
	}
	original := os.Stdout
	os.Stdout = w
	defer func() { os.Stdout = original }()

	fn()
	_ = w.Close()

	var buf bytes.Buffer
	if _, err := io.Copy(&buf, r); err != nil {
		t.Fatal(err)
	}
	return buf.String()
}
