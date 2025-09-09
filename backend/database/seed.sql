-- CrisisAssist Database Seed Data
-- Sample data for development and testing

-- Insert sample users
INSERT INTO users (id, email, name, role, descope_user_id) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'admin@crisisassist.com', 'Crisis Admin', 'admin', 'admin_user_001'),
('550e8400-e29b-41d4-a716-446655440002', 'responder@crisisassist.com', 'Emergency Responder', 'responder', 'responder_001'),
('550e8400-e29b-41d4-a716-446655440003', 'coordinator@crisisassist.com', 'Relief Coordinator', 'coordinator', 'coordinator_001')
ON CONFLICT (email) DO NOTHING;

-- Insert sample agent tokens
INSERT INTO agent_tokens (agent_id, agent_type, token_hash, scopes) VALUES
('alert_agent_001', 'alert', 'hash_alert_001', ARRAY['alert.read', 'alert.write']),
('scheduler_agent_001', 'scheduler', 'hash_scheduler_001', ARRAY['calendar.write', 'event.create']),
('verifier_agent_001', 'verifier', 'hash_verifier_001', ARRAY['verify.document', 'content.validate']),
('notifier_agent_001', 'notifier', 'hash_notifier_001', ARRAY['message.send', 'notification.create'])
ON CONFLICT (agent_id) DO NOTHING;

-- Insert sample alerts
INSERT INTO alerts (id, type, severity, title, description, location_address, location_lat, location_lng, status, created_by) VALUES
('660e8400-e29b-41d4-a716-446655440001', 'earthquake', 'high', 'Earthquake Alert - Magnitude 6.2', 'Strong earthquake detected in downtown area. Immediate response required.', '123 Main St, Downtown', 40.7128, -74.0060, 'active', '550e8400-e29b-41d4-a716-446655440001'),
('660e8400-e29b-41d4-a716-446655440002', 'flood', 'critical', 'Flash Flood Warning', 'Severe flooding in residential areas. Evacuation may be necessary.', '456 River Rd, Riverside District', 40.7589, -73.9851, 'active', '550e8400-e29b-41d4-a716-446655440002'),
('660e8400-e29b-41d4-a716-446655440003', 'fire', 'medium', 'Building Fire Report', 'Fire reported in commercial building. Fire department dispatched.', '789 Business Ave, Commercial District', 40.7505, -73.9934, 'resolved', '550e8400-e29b-41d4-a716-446655440003')
ON CONFLICT (id) DO NOTHING;
