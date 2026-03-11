-- Create ENUM for flow types
CREATE TYPE flow_type_enum AS ENUM ('standard', 'person_1', 'person_2');

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    flow_type flow_type_enum NOT NULL DEFAULT 'standard',
    lock_until_timestamp TIMESTAMPTZ,
    current_step INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions Table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Secret Admin Data (For Person 2)
CREATE TABLE secret_admin_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_message_count INTEGER NOT NULL DEFAULT 0,
    unblur_revealed BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timeline Messages (For Person 2)
CREATE TABLE timeline_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TEXT NOT NULL,
    message_content TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Setup
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_admin_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_messages ENABLE ROW LEVEL SECURITY;

-- Create Policies (Assuming anonymous access for the frontend, but locked down to specific operations)

-- Users: Anyone can read, anyone can update lock_until_timestamp and current_step
CREATE POLICY "Allow public read on users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public update on users" ON users FOR UPDATE USING (true) WITH CHECK (true);

-- Questions: Anyone can read
CREATE POLICY "Allow public read on questions" ON questions FOR SELECT USING (true);

-- Secret Admin Data: Anyone can read
CREATE POLICY "Allow public read on secret_admin_data" ON secret_admin_data FOR SELECT USING (true);

-- Timeline Messages: Anyone can read
CREATE POLICY "Allow public read on timeline_messages" ON timeline_messages FOR SELECT USING (true);

-- INSERT INITIAL DUMMY DATA
INSERT INTO users (name, flow_type) VALUES
('Moh', 'person_2');

-- Moh's actual questions (Following Person 2 secret flow)
INSERT INTO questions (user_id, question_text, correct_answer, step_number)
SELECT id, 'What is the exact name I have saved for you in my phone?', 'geet 99.5', 1 FROM users WHERE name = 'Moh';

-- Initial Admin Data
INSERT INTO secret_admin_data (current_message_count, unblur_revealed) VALUES (42, false);

-- Timeline Messages
INSERT INTO timeline_messages (date, message_content, order_index) VALUES
('Jan 1', 'First message', 1),
('Feb 14', 'Second message', 2);
