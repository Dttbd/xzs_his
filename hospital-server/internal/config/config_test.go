package config

import "testing"

func TestValidateWeChat_EnabledRequiresCreds(t *testing.T) {
	cfg := &Config{WeChat: WeChatConfig{Enabled: true}}
	if err := cfg.validateWeChat(); err == nil {
		t.Fatal("expected error when enabled but creds missing, got nil")
	}
}

func TestValidateWeChat_DisabledOK(t *testing.T) {
	cfg := &Config{WeChat: WeChatConfig{Enabled: false}}
	if err := cfg.validateWeChat(); err != nil {
		t.Fatalf("expected nil when disabled, got %v", err)
	}
}

func TestValidateWeChat_EnabledWithCredsOK(t *testing.T) {
	cfg := &Config{WeChat: WeChatConfig{
		Enabled: true, CorpID: "c", AgentID: 1, Secret: "s", Callback: "https://x/cb",
	}}
	if err := cfg.validateWeChat(); err != nil {
		t.Fatalf("expected nil with full creds, got %v", err)
	}
}
