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
    time TEXT,
    message_content TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Logs (For Admin Dashboard)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Setup
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_admin_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

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

-- Activity Logs: Anyone can insert, anyone can read (in this simple setup)
CREATE POLICY "Allow public insert on activity_logs" ON activity_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read on activity_logs" ON activity_logs FOR SELECT USING (true);

-- INSERT INITIAL DUMMY DATA
INSERT INTO users (name, flow_type) VALUES
('Moh', 'person_2');

-- Moh's actual questions (Following Person 2 secret flow)
INSERT INTO questions (user_id, question_text, correct_answer, step_number)
SELECT id, 'What is the exact name I have saved for you in my phone?', 'mohsina', 1 FROM users WHERE name = 'Moh';

-- Initial Admin Data
INSERT INTO secret_admin_data (current_message_count, unblur_revealed) VALUES (23, false);

-- Timeline Messages
INSERT INTO timeline_messages (date, time, message_content, order_index) VALUES
('March 8', 'Time unrecorded', 'She wrote alhamdulillah. I want to reply, ask why, and know more. But I can''t.', 1),
('March 8', 'Time unrecorded', 'You are active now. I want to react ''haha'' and strike up a conversation. I want to message, but I shouldn''t.', 2),
('March 8', 'Time unrecorded', 'Basay pani nai. Wanted to tell you that too. It is hard. Lagtese Mohsina detox. Shudu msg korte iccha kore. Previously, I had an emotional factor supporting my silence, this time none. You are replying instantly.', 3),
('March 8', '7:20 PM', 'You posted a video with an effect I always wanted to use. Wanted to ask ''kivabe diso''. Can''t even do that. Just saved it.', 4),
('March 8', '10:35 PM', 'Jai ektu ''aaaaaaaaaa'' msg dia asi. (Stopped myself).', 5),
('March 8', '11:00 PM', 'Wanted to continue our conversation after class about doing something Islamically. We make a plan, say yes, and then hesitate. I usually have to remind you. I have come to peace with this dynamic, but this time I can''t message. You''ll think I''m not interested. I should give a reminder.', 6),
('March 8', '11:45 PM', 'Just realized I can''t talk to you the whole Eid and the rest of the Rojas because there most likely won''t be any quiz before Eid. For the first time, I actually want a quiz to happen.', 7),
('March 9', '12:37 AM', '(Just wanted to text you)', 8),
('March 9', '2:16 PM', '(Just wanted to text you)', 9),
('March 9', '5:42 PM', 'Janoo ekta interesting ghotona hoise. My crocs got swapped at the mosque. A guy thought I took his, I thought they were mine. A whole confusing mess. I just wanted to tell you the whole story.', 10),
('March 9', '6:52 PM', '(Just wanted to text you)', 11),
('March 10', '2:47 PM', '(Just wanted to text you)', 12),
('March 10', '5:09 PM', '(Just wanted to text you)', 13),
('March 10', '11:44 PM', '(Just wanted to text you)', 14),
('March 11', '12:10 AM', '(Just wanted to text you)', 15),
('March 11', '1:27 PM', '(Just wanted to text you)', 16),
('March 12', 'Time unrecorded', 'Thank u Mohsina. Ajke jodi if I was a little off to u, it''s due to my punishment. I wanna punish myself but I don''t know how to do it and stay my full self. The main goal was to punish myself by not disrespecting u. Other times when I went silent, it was to show I was mad, a way of saying ''hey I am here, don''t forget me.'' It hurt u. This time, I don''t wanna be hurtful. I try to maintain the conversation when u start it, but I won''t start it. So I am just hurting myself.', 17);
